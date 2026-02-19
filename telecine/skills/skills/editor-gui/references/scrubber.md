---
title: Scrubber Element
description: Timeline scrubber control with horizontal and vertical modes for playback navigation
type: reference
nav:
  parent: "Timeline"
  priority: 12
api:
  attributes:
    - name: target
      type: string
      description: ID of target temporal element to control
    - name: orientation
      type: string
      default: horizontal
      description: Layout orientation ("horizontal" or "vertical")
    - name: current-time-ms
      type: number
      description: Current playback time in milliseconds
    - name: duration-ms
      type: number
      description: Total duration in milliseconds
    - name: zoom-scale
      type: number
      default: 1.0
      description: Zoom level for vertical timeline mode
    - name: fps
      type: number
      description: Frame rate for frame-snapping behavior
  parts:
    - name: scrubber
      description: Main scrubber container
    - name: progress
      description: Progress bar fill (horizontal mode only)
    - name: handle
      description: Draggable handle (horizontal mode only)
    - name: playhead
      description: Vertical playhead line (vertical mode only)
  events:
    - name: seek
      detail: number
      description: Emitted when user seeks to a new time position
react:
  generate: true
  componentName: Scrubber
  importPath: "@editframe/react"
  propMapping:
    current-time-ms: currentTimeMs
    duration-ms: durationMs
    zoom-scale: zoomScale
  additionalProps:
    - name: className
      type: string
      description: CSS classes for styling
    - name: containerWidth
      type: number
      description: Container width for calculations
    - name: rawScrubTimeMs
      type: "number | null"
      description: Raw scrub time without frame snapping
    - name: scrollContainerRef
      type: React.RefObject<HTMLElement>
      description: Reference to scroll container for timeline sync
    - name: isScrubbingRef
      type: React.MutableRefObject<boolean>
      description: Ref to track scrubbing state
    - name: onSeek
      type: "(time: number) => void"
      description: Callback fired when seeking to a new time
  nav:
    parent: "Components / Timeline Controls"
    priority: 60
    related: ["time-display", "controls"]
---

<!-- html-only -->
# ef-scrubber
<!-- /html-only -->
<!-- react-only -->
# Scrubber
<!-- /react-only -->

Timeline scrubber control for navigating playback time. Supports both horizontal progress bar mode and vertical timeline mode with zoom.

<!-- react-only -->
## Import

```tsx
import { Scrubber } from "@editframe/react";
```

Also available: `ScrubberProps` type for TypeScript.
<!-- /react-only -->

## Basic Usage

<!-- html-only -->
Horizontal scrubber with progress bar.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="scrubber-demo">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
</ef-timegroup>
<div class="flex flex-col gap-2 p-4 bg-gray-900 rounded-lg mt-4">
  <ef-scrubber target="scrubber-demo"></ef-scrubber>
  <ef-controls target="scrubber-demo" class="flex gap-2 items-center">
    <ef-toggle-play class="px-3 py-1 bg-blue-600 text-white rounded"></ef-toggle-play>
    <ef-time-display class="text-white text-sm"></ef-time-display>
  </ef-controls>
</div>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
import { Preview, Scrubber } from "@editframe/react";

<div className="flex flex-col gap-2">
  <Preview className="w-full h-[600px]" />
  <Scrubber className="w-full h-2 bg-gray-700 rounded cursor-pointer" />
</div>
```

The scrubber automatically connects to the nearest timeline context via Preview or Controls.
<!-- /react-only -->

<!-- react-only -->
## In Control Bar

Typical control bar layout:

```tsx
import { TogglePlay, Scrubber, TimeDisplay } from "@editframe/react";

export const ControlBar = () => {
  return (
    <div className="bg-gray-800 p-4 flex items-center gap-4">
      <TogglePlay>
        <button slot="play" className="w-10 h-10 text-white">▶</button>
        <button slot="pause" className="w-10 h-10 text-white">⏸</button>
      </TogglePlay>

      <TimeDisplay className="text-white text-sm font-mono" />
      <Scrubber className="flex-1 h-2" />
    </div>
  );
};
```
<!-- /react-only -->

## Vertical Timeline Mode

<!-- html-only -->
Vertical scrubber displays a playhead line that moves across a timeline. Used in `ef-timeline` and `ef-filmstrip` components.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="vertical-demo">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
</ef-timegroup>
<div class="mt-4 h-[120px] relative overflow-hidden bg-gray-900 rounded-lg">
  <ef-scrubber
    target="vertical-demo"
    orientation="vertical"
    zoom-scale="2"
    class="absolute inset-0"
  ></ef-scrubber>
  <div class="absolute top-0 left-0 right-0 h-6 bg-gray-800 text-white text-xs flex items-center justify-center">
    Timeline (scroll to see full width)
  </div>
</div>
<div class="mt-2 flex gap-2">
  <ef-controls target="vertical-demo">
    <ef-toggle-play class="px-3 py-1 bg-blue-600 text-white rounded"></ef-toggle-play>
  </ef-controls>
</div>
```
<!-- /html-only -->
<!-- react-only -->
Use vertical orientation for timeline views:

```tsx
<Scrubber
  orientation="vertical"
  className="w-full h-full"
/>
```

Vertical scrubbers are typically used in filmstrip/timeline views where the playhead moves vertically.
<!-- /react-only -->

## Frame Snapping

When `fps` is set, scrubbing snaps to frame boundaries.

<!-- html-only -->
```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="snap-demo" fps="30">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
</ef-timegroup>
<div class="flex flex-col gap-2 p-4 bg-gray-900 rounded-lg mt-4">
  <div class="text-white text-sm mb-2">Scrubbing snaps to 30fps frame boundaries:</div>
  <ef-scrubber target="snap-demo" fps="30"></ef-scrubber>
  <ef-controls target="snap-demo" class="flex gap-2 items-center">
    <ef-toggle-play class="px-3 py-1 bg-blue-600 text-white rounded"></ef-toggle-play>
    <ef-time-display class="text-white text-sm"></ef-time-display>
  </ef-controls>
</div>
```
<!-- /html-only -->
<!-- react-only -->
Enable frame-accurate seeking:

```tsx
<Scrubber
  fps={30}
  className="w-full h-2"
/>
```

When `fps` is provided, the scrubber snaps to frame boundaries during seeking.
<!-- /react-only -->

## Custom Styling

<!-- html-only -->
### CSS Parts

Style scrubber appearance using `::part()` selectors.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[480px] bg-black" id="styled-scrubber">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="size-full object-contain"></ef-video>
</ef-timegroup>
<div class="flex flex-col gap-2 p-4 bg-gray-900 rounded-lg mt-4">
  <ef-scrubber target="styled-scrubber" id="custom-scrubber"></ef-scrubber>
  <ef-controls target="styled-scrubber" class="flex gap-2 items-center">
    <ef-toggle-play class="px-3 py-1 bg-blue-600 text-white rounded"></ef-toggle-play>
    <ef-time-display class="text-white text-sm"></ef-time-display>
  </ef-controls>
</div>

<style>
  #custom-scrubber::part(scrubber) {
    background: linear-gradient(to right, #1e293b, #334155);
    height: 8px;
    border-radius: 4px;
  }

  #custom-scrubber::part(progress) {
    background: linear-gradient(to right, #3b82f6, #8b5cf6);
    border-radius: 4px;
  }

  #custom-scrubber::part(handle) {
    width: 16px;
    height: 16px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
</style>
```
<!-- /html-only -->
<!-- react-only -->
Style the scrubber track and handle:

```tsx
<Scrubber
  className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer"
/>
```
<!-- /react-only -->

## CSS Custom Properties

Control scrubber appearance through CSS variables:

<!-- html-only -->
```css
ef-scrubber {
  --ef-scrubber-height: 4px;
  --ef-scrubber-background: rgba(255, 255, 255, 0.2);
  --ef-scrubber-progress-color: #fff;
  --ef-scrubber-handle-size: 12px;
}
```
<!-- /html-only -->
<!-- react-only -->
```tsx
<Scrubber
  className="w-full"
  style={{
    '--ef-scrubber-height': '6px',
    '--ef-scrubber-background': 'rgba(255, 255, 255, 0.2)',
    '--ef-scrubber-progress-color': '#3b82f6',
    '--ef-scrubber-handle-size': '16px',
  } as React.CSSProperties}
/>
```

### Available CSS Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `--ef-scrubber-height` | `4px` | Track height |
| `--ef-scrubber-background` | `rgba(255, 255, 255, 0.2)` | Track background color |
| `--ef-scrubber-progress-color` | `#fff` | Progress bar and handle color |
| `--ef-scrubber-handle-size` | `12px` | Handle diameter |
<!-- /react-only -->

<!-- react-only -->
## CSS Shadow Parts

Style internal elements using `::part()`:

```tsx
<Scrubber
  className={`
    w-full h-1.5 bg-white/20 rounded-full cursor-pointer
    [&::part(progress)]:bg-red-500
    [&::part(progress)]:rounded-full
    [&::part(handle)]:bg-white
    [&::part(handle)]:w-3
    [&::part(handle)]:h-3
    [&::part(handle)]:rounded-full
    [&::part(handle)]:shadow-lg
  `}
/>
```

### Available Parts

| Part | Description |
|------|-------------|
| `scrubber` | The track container |
| `progress` | The filled progress bar |
| `handle` | The draggable seek handle |
<!-- /react-only -->

## Seek Events

<!-- html-only -->
```html
<ef-scrubber target="my-video" id="my-scrubber"></ef-scrubber>

<script>
  const scrubber = document.getElementById('my-scrubber');
  scrubber.addEventListener('seek', (e) => {
    console.log('Seeking to:', e.detail, 'ms');
  });
</script>
```
<!-- /html-only -->
<!-- react-only -->
Listen to seek events:

```tsx
import { Scrubber } from "@editframe/react";

<Scrubber
  onSeek={(time) => {
    console.log('Seeking to:', time, 'ms');
  }}
  className="w-full h-2"
/>
```
<!-- /react-only -->

<!-- react-only -->
## With Timeline Sync

Sync scrubber with a scrollable timeline:

```tsx
import { useRef, useState } from "react";
import { Scrubber } from "@editframe/react";

export const TimelineWithScrubber = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const [zoomScale, setZoomScale] = useState(1);

  return (
    <div>
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto"
      >
        {/* Timeline content */}
      </div>

      <Scrubber
        orientation="vertical"
        zoomScale={zoomScale}
        scrollContainerRef={scrollContainerRef}
        isScrubbingRef={isScrubbingRef}
        className="w-full h-full"
      />
    </div>
  );
};
```
<!-- /react-only -->

<!-- react-only -->
## TypeScript Types

```tsx
import type { ScrubberProps } from "@editframe/react";

const scrubberConfig: ScrubberProps = {
  orientation: "horizontal",
  zoomScale: 1.5,
  fps: 30,
  className: "w-full h-2",
  onSeek: (time) => console.log(time),
};
```
<!-- /react-only -->

<!-- react-only -->
## Styled Examples

### Gradient Progress

```tsx
<Scrubber
  className="w-full h-2"
  style={{
    '--ef-scrubber-background': 'rgba(0, 0, 0, 0.2)',
    '--ef-scrubber-progress-color': 'linear-gradient(to right, #3b82f6, #8b5cf6)',
  } as React.CSSProperties}
/>
```

### Large Handle

```tsx
<Scrubber
  className="w-full h-3"
  style={{
    '--ef-scrubber-height': '12px',
    '--ef-scrubber-handle-size': '20px',
    '--ef-scrubber-progress-color': '#10b981',
  } as React.CSSProperties}
/>
```

### Minimal Scrubber

```tsx
<Scrubber
  className="w-full h-0.5"
  style={{
    '--ef-scrubber-height': '2px',
    '--ef-scrubber-handle-size': '0px',
    '--ef-scrubber-background': 'transparent',
    '--ef-scrubber-progress-color': '#ef4444',
  } as React.CSSProperties}
/>
```
<!-- /react-only -->

<!-- react-only -->
## Full Editor Example

Complete video editor with styled scrubber:

```tsx
import {
  Preview,
  TogglePlay,
  ToggleLoop,
  Scrubber,
  TimeDisplay,
} from "@editframe/react";

export const VideoEditor = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex items-center justify-center p-8">
        <Preview className="w-full max-w-[1280px] aspect-video bg-black rounded-lg" />
      </div>

      <div className="bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-4 px-6 py-3">
          <TogglePlay>
            <button slot="play" className="w-8 h-8 text-white hover:text-blue-400">
              ▶
            </button>
            <button slot="pause" className="w-8 h-8 text-white hover:text-gray-400">
              ⏸
            </button>
          </TogglePlay>

          <TimeDisplay className="text-white text-sm font-mono min-w-[120px]" />

          <div className="flex-1">
            <Scrubber
              className="w-full"
              style={{
                '--ef-scrubber-height': '6px',
                '--ef-scrubber-background': 'rgba(255, 255, 255, 0.15)',
                '--ef-scrubber-progress-color': '#3b82f6',
                '--ef-scrubber-handle-size': '14px',
              } as React.CSSProperties}
            />
          </div>

          <ToggleLoop>
            <button slot="off" className="w-8 h-8 text-gray-400 hover:text-white">
              🔁
            </button>
            <button slot="on" className="w-8 h-8 text-green-400 hover:text-green-300">
              🔁
            </button>
          </ToggleLoop>
        </div>
      </div>
    </div>
  );
};
```

## Minimal Controls

Compact control layout:

```tsx
<div className="flex items-center gap-2 p-2 bg-black/80 rounded">
  <TogglePlay className="w-6 h-6 text-white">
    <button slot="play">▶</button>
    <button slot="pause">⏸</button>
  </TogglePlay>
  <Scrubber className="flex-1 h-1" />
</div>
```
<!-- /react-only -->

## Usage Modes

**Horizontal mode** — Compact progress bar for playback controls:
- Shows progress fill and draggable handle
- Best for control panels and compact UIs
- Automatically reads duration from context

**Vertical mode** — Timeline scrubber for editing:
- Shows vertical playhead line
<!-- html-only -->
- Requires `zoom-scale` for proper positioning
- Used internally by `ef-timeline` and `ef-filmstrip`
<!-- /html-only -->
<!-- react-only -->
- Requires `zoomScale` for proper positioning
- Used internally by Timeline and Filmstrip components
<!-- /react-only -->
- Supports scrollable timelines with edge detection

## Interaction

The scrubber supports:
- **Click:** Jump to position
- **Drag:** Scrub through timeline
- **Touch:** Mobile-friendly touch controls

All interactions automatically update the connected timeline's playback position.

## Accessibility

The scrubber is keyboard accessible and supports:
- Click to seek
- Drag to scrub
- Touch gestures on mobile devices

For enhanced accessibility, consider wrapping in a labeled container:

<!-- html-only -->
```html
<div role="group" aria-label="Video scrubber">
  <ef-scrubber target="my-video"></ef-scrubber>
</div>
```
<!-- /html-only -->
<!-- react-only -->
```tsx
<div role="group" aria-label="Video scrubber">
  <Scrubber className="w-full h-2" />
</div>
```
<!-- /react-only -->
