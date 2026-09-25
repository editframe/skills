---
name: editor-gui
description: "Build video editing interfaces with Editframe's GUI components. Assemble a timeline, scrubber, canvas, preview, playback controls, and transform handles into a custom editor. Use this for a timeline, scrubber, preview, playback control, volume control, mute button, fullscreen toggle, picture-in-picture toggle, resolution picker, trim handle, or hierarchy panel."
license: MIT
metadata:
  author: editframe
  version: "2.0"
---


# Editor Toolkit

Build a video editing interface by composing GUI components. Each component is a self-contained custom element. Each component connects to your composition through a `target` attribute. Build the composition itself with the `composition` skill. These components add the controls and views around it.

## Quick Start

```html
<ef-timegroup id="my-video">
  <ef-video src="/video.mp4"></ef-video>
</ef-timegroup>

<ef-controls target="my-video">
  <ef-toggle-play></ef-toggle-play>
  <ef-scrubber></ef-scrubber>
  <ef-time-display></ef-time-display>
</ef-controls>
```

`ef-timegroup` sets no `mode` here, so it defaults to `contain`. Its duration comes from `video.mp4`'s own length, not from a hardcoded number. See the `composition` skill's Timegroups & sequencing section for the full duration model.

## Core Concepts: Target & Bridge

Each playback control (`ef-play`, `ef-pause`, `ef-toggle-play`, `ef-toggle-loop`, `ef-volume`, `ef-mute`, `ef-scrubber`, `ef-time-display`) resolves the composition it drives in this order:

1. Its own `target="id-or-selector"` attribute, if set. This resolves directly.
2. Otherwise, it walks up through ancestor `ef-controls`, `ef-preview`, and `ef-configuration` elements. An ancestor with its own `target` resolves there, in one hop. A bare `ef-configuration` ancestor resolves to itself. The control climbs past a bare `ef-controls` or `ef-preview` ancestor to look further up.
3. As a last resort, it resolves to the nearest enclosing temporal root.

`ef-controls` is a pure proxy. It renders nothing itself. It gives a group of descendant controls a shared `target`, so each control does not need its own:

```html
<ef-timegroup id="my-video" mode="contain">…</ef-timegroup>

<!-- Elsewhere in the DOM -->
<ef-controls target="my-video">
  <ef-toggle-play></ef-toggle-play>
  <ef-scrubber></ef-scrubber>
</ef-controls>
```

`ef-canvas`, `ef-hierarchy`, and `ef-timeline` share selection state through a separate, independent mechanism: a shared `SelectionBridge`, keyed by the resolved composition root. This is not the playback bridge above. Selecting a row in `ef-hierarchy` highlights it in `ef-canvas`, and the reverse also works. Neither element needs to reference the other directly.

## Preview & Canvas

`ef-preview` is a thin passthrough container. It tracks which element the pointer hovers over, and fires `focus-changed`. `ef-canvas` uses it internally for hover highlighting.

`ef-canvas` wraps your composition as light-DOM children, the same as `ef-preview`. It adds click-to-select, drag-to-move, corner-resize, and rotate directly on top of your composition. It shares selection state with `ef-hierarchy` and `ef-timeline` through `SelectionBridge`. When you set no explicit `target`, it auto-assigns one from the first slotted temporal child's `id`. Set `readonly` to keep the overlays visible but non-interactive.

```html
<ef-canvas class="relative">
  <ef-timegroup id="scene" mode="contain" class="w-[1920px] h-[1080px]">
    <ef-video id="bg" src="/bg.mp4" class="absolute inset-0 size-full object-cover"></ef-video>
    <ef-text id="title" duration="5s" class="absolute top-12 left-12 text-6xl text-white">Title</ef-text>
  </ef-timegroup>
</ef-canvas>
```

- Click a selectable element, any `TemporalElement` with an `id`, to select it. This replaces the current selection.
- Click the empty canvas background to deselect.
- Drag from the empty background to draw a marquee. This selects every element the marquee touches. Hold Shift or Cmd/Ctrl while you release, to add to the existing selection instead of replacing it.
- Drag a selection box's body to move it.
- Drag a corner or edge handle to resize it. Hold Shift to lock the aspect ratio. Hold Cmd/Ctrl to resize from the center.
- Drag the rotate handle to rotate. Hold Shift to snap to 15° increments.
- `ef-canvas` fires a single `canvas-transform` event (`{ elementId }`) once a drag, resize, or rotate gesture ends. It does not fire continuously during the drag.
- `ef-canvas` has no built-in keyboard support: no arrow-key nudge, no delete, and so on. It also has no multi-select through a Shift-click or Cmd-click on a single element. Only marquee-drag supports additive multi-select.

`ef-pan-zoom` wraps its content in a pannable, zoomable viewport. Drag to pan. Use the wheel or a pinch gesture to zoom. It exposes `screenToCanvas()`, `canvasToScreen()`, `reset()`, and `fitToContent()` methods, plus a `transform-changed` event. It has no shadow root. Its content wrapper is a plain light-DOM child, exposed as `[part="content"]`.

`ef-fit-scale` is a light-DOM container. It scales its first child to fit the available space, while it preserves the aspect ratio. It recalculates the scale on every `ResizeObserver` or `MutationObserver` change. Use it, typically, to wrap a fixed-resolution composition inside `ef-pan-zoom`.

## Playback & Display Controls

`ef-play` and `ef-pause` each hide themselves while playing or paused. Wrap your own button as their default-slot content. `ef-toggle-play` swaps its `slot="play"`/`slot="pause"` content on click. `ef-toggle-loop` toggles loop mode on click. All three resolve their target through the target/bridge pattern above.

`ef-volume` is a native range slider, from 0 to 1, bound to the resolved composition's volume. `ef-mute` swaps its `slot="muted"`/`slot="unmuted"` content on click. `ef-fullscreen` and `ef-pip` toggle the Fullscreen and Picture-in-Picture APIs on their `target`. Each swaps its `slot="enter"`/`slot="exit"` content on click. `ef-pip`'s target can be a `<video>`, a `<canvas>` (through `captureStream()`), or a container to search within. `ef-resolution` is a dropdown plus custom width/height inputs. It sets a `target` element's inline CSS size and fires `resolution-change`.

## Timeline

`ef-timeline` composes a sticky hierarchy column, per-element track rows, and a time ruler into one scrollable region. It adds trim handles, thumbnail strips, and waveform strips automatically, per row, for each trimmable video or audio element. There is no flag to enable them.

```html
<ef-timegroup id="comp" mode="sequence" class="w-[1920px] h-[1080px]">
  <ef-video src="/clip.mp4" duration="5s"></ef-video>
  <ef-text duration="5s">Title</ef-text>
</ef-timegroup>

<div class="h-64">
  <ef-timeline target="comp" pixels-per-second="80"></ef-timeline>
</div>
```

`ef-timeline` shares selection with `ef-canvas`/`ef-hierarchy` through `SelectionBridge` and fires `timeline-select` per row. It has no filtering attributes (`hide`/`show`), no zoom-limit attribute, and no panel-visibility attribute. See the Element Reference below for its actual, small attribute set.

Standalone timeline pieces (each also usable outside `ef-timeline`, and each covered fully by the Element Reference below):

- `ef-scrubber` — a playhead scrubber. `orientation="horizontal"` (the default) renders a progress bar with a drag handle, sized to the track's own width. `orientation="vertical"` renders a thin playhead line, positioned through `pixels-per-second`, for use inside a scrolling timeline track. Its times use **milliseconds** (`current-time-ms`, `duration-ms`).
- `ef-time-display` — formats `currentTime / duration`, in seconds, as `M:SS / M:SS`, from the resolved `PlaybackBridge`. It accepts only `target`. It does not accept standalone `current-time-ms`/`duration-ms` override attributes.
- `ef-timeline-ruler` — canvas-rendered tick marks and second labels. It reads `duration`, `pixels-per-second`, and `fps`, or `duration-ms` and `zoom-scale` for Motion-Designer-style timelines.
- `ef-trim-handles` — draggable in and out points. `mode="standalone"` shows a full draggable region between the two handles. `mode="track"` pins the handles to the container's edges. `ef-timeline`'s rows use this mode. Its times use **seconds** (`intrinsic-duration`, `pixels-per-second`), a different unit convention than `ef-scrubber`. `value` (`{start, end}`) is a JS property, not an attribute. It fires `trim-change` continuously, and fires `trim-change-end` once.
- `ef-thumbnail-strip` and `ef-waveform-strip` — mirror a source `<ef-video>`/`<ef-audio>`'s own attributes directly: `src`, `variants`, `sourcein`/`sourceout`, `trimstart`/`trimend`. Neither takes a `target` id reference. For standalone use, set these attributes side by side with the source element, or copy them from it. Inside `ef-timeline`, this wiring happens automatically, per row.

## Transform & Manipulation

`ef-transform-handles` is a controlled overlay. It does not track a target element itself. Position it explicitly through its `bounds` JS property: `{x, y, width, height, rotation?}`, in the host's local pixel space. Then apply the result of its `bounds-change`/`rotation-change` events back onto your own target element, and back onto `bounds`.

```html
<div style="position: relative;">
  <ef-video id="clip" src="/clip.mp4" style="position: absolute; left: 0; top: 0; width: 320px; height: 180px; transform-origin: center;"></ef-video>
  <ef-transform-handles id="handles" enable-rotation></ef-transform-handles>
</div>
<script>
  const clip = document.getElementById("clip");
  const handles = document.getElementById("handles");
  handles.bounds = { x: 0, y: 0, width: 320, height: 180 };
  handles.addEventListener("bounds-change", (e) => {
    const { x, y, width, height } = e.detail.bounds;
    Object.assign(clip.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    handles.bounds = e.detail.bounds;
  });
  handles.addEventListener("rotation-change", (e) => {
    const { rotation } = e.detail;
    clip.style.transform = `rotate(${rotation}deg)`;
    handles.bounds = { ...handles.bounds, rotation };
  });
</script>
```

Resizing supports Shift to lock the aspect ratio, through `lock-aspect-ratio`-style constraints, and a `rotation-step` for angle snapping. `corners-only` hides the edge handles. `enable-drag`, `enable-resize`, and `enable-rotation` each toggle one interaction independently. This element is the general-purpose building block behind `ef-canvas`'s own built-in selection boxes. Use it directly when you need transform handles decoupled from canvas selection.

`ef-dial` is a circular drag control. It produces a `value` in degrees, from 0 to 360, wrapping. `value` is a **JS property only**. It has no observed HTML attribute. `<ef-dial value="45">` will not initialize the dial at 45°. Set `.value` after you create the element instead. Hold Shift while you drag, to snap to 15° increments. It fires `change`.

## Overlay System

`ef-overlay-layer` and `ef-overlay-item` implement a pattern different from target/bridge. They passively follow a target element's on-screen position every frame, through the shared RAF scheduler, instead of controlling playback. `ef-overlay-layer` must be a sibling of `ef-pan-zoom`, or nested inside it, to stay aligned as the user pans and zooms.

```html
<ef-pan-zoom>
  <ef-fit-scale>
    <ef-timegroup id="comp" mode="contain" class="w-[1920px] h-[1080px]">
      <ef-video id="clip" src="/clip.mp4"></ef-video>
    </ef-timegroup>
  </ef-fit-scale>
</ef-pan-zoom>
<ef-overlay-layer>
  <ef-overlay-item id="clip-overlay">
    <div class="border-2 border-blue-500"></div>
  </ef-overlay-item>
</ef-overlay-layer>
<script>
  document.getElementById("clip-overlay").target = "clip";
</script>
```

Set the target through the `target` JS property. Pass a CSS selector string (this falls back to `getElementById` for a plain id) or a direct element reference. The `element-id` HTML attribute offers an alternate lookup: it matches a target's `data-element-id`/`data-timegroup-id` attribute instead. Nothing in a composition sets these two data attributes by default. Add them yourself. This element fires `position-changed`, with the tracked target's `{x, y, width, height, rotation}`, whenever the target moves by more than 0.01px.

## Editor Shells

`ef-workbench` composes a hierarchy panel, a canvas with selection, a timeline, and transport controls into a full three-panel editor layout. Transport controls (play, pause, loop, time) are separate from the toolbar. `ef-workbench` takes a **single default slot**, your composition, and auto-wraps it in `<ef-configuration>`/`<ef-canvas>` when not already wrapped. There are no `slot="canvas"`, `slot="hierarchy"`, or `slot="timeline"` slots.

```html
<ef-workbench class="w-full h-screen" resolution="1920x1080">
  <ef-timegroup mode="sequence" class="w-[1920px] h-[1080px]">
    <ef-timegroup mode="fixed" duration="3s">
      <ef-text duration="3s">Opening</ef-text>
    </ef-timegroup>
    <ef-video src="/clip.mp4"></ef-video>
  </ef-timegroup>
</ef-workbench>
```

`resolution` (`"WIDTHxHEIGHT"`) sets the composition's true rendered size. This is the fixed-size stage that `ef-pan-zoom`/`fitToContent()` scales to fit. Call `.exportVideo(options?)` to render the composition to an MP4, through an offscreen render clone. The live preview stays untouched. This method dispatches bubbling `export-start`, `export-progress`, `export-complete`, and `export-error` events. The toolbar Export button uses this same method. A `.previewMode` JS property (`"dom" | "canvas"`, not an attribute) switches between the live DOM composition and a canvas-rasterized preview. A native render host sets `rendering` to collapse the workbench to just the bare stage. Do not use `rendering` as a "hide toolbar" convenience flag for normal use.

`ef-hierarchy` is a standalone layer-panel tree. Use it independently, without `ef-workbench`. It shares the same `target`/selection-sharing pattern as `ef-canvas`. Point both elements at the same composition root id, not at `ef-canvas`'s own id, so their `SelectionBridge`s resolve to the same root and stay in sync:

```html
<ef-hierarchy target="comp" show-header header="Layers" class="w-64"></ef-hierarchy>
<ef-canvas>
  <ef-timegroup id="comp" mode="contain" class="w-[1920px] h-[1080px]">…</ef-timegroup>
</ef-canvas>
```

It shares selection with `ef-canvas`/`ef-timeline` through `SelectionBridge`, not through `@lit/context`. This version of Editframe removes `@lit/context` entirely. `.select(id)` and `.getSelectedElementId()` control selection. `.setHighlighted(el)` and `.getHighlightedElement()` control hover-highlight, and fire `hierarchy-highlight`. Dragging a row fires `hierarchy-reorder`, with `{ sourceId, targetId, position }`. `hideSelectors` and `showSelectors` (string-array **JS properties**, not attributes) filter which elements appear, by CSS selector.

## Element Reference

### `ef-agent-pane`

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-font-family` | `system-ui` | _TODO: document this custom property._ |

### `ef-ai-editor`

A shared composition workspace with revision-scoped conversation and manual edits.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `presentation` | `presentationMode` | "simple" \\| "advanced" | — | _TODO: document this attribute._ |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-ai-agent-width` | `${AGENT_WIDTH_DEFAULT}px` | _TODO: document this custom property._ |
| `--ef-font-family` | `system-ui, sans-serif` | _TODO: document this custom property._ |

**Slots**

- (default slot) — _TODO: document this slot._

**Fires**

- `connection-error` (`unknown`) — _TODO: document this event._
- `editor-error` (`string`) — _TODO: document this event._
- `export-complete` (`{ snapshotId: string; filename: string; byteSize: number; durationMs: number; durationSeconds: number; width: number; height: number; fps: number; mimeType: string; url: string }`) — _TODO: document this event._
- `export-end` (`{ snapshotId: string }`) — _TODO: document this event._
- `export-error` (`{ snapshotId: string; error: string }`) — _TODO: document this event._
- `export-progress` (`{ snapshotId: string; frame: number; totalFrames: number; time: number; duration: number; elapsedMs: number; estimatedRemainingMs: number; speedMultiplier: number; framePreviewCanvas?: HTMLCanvasElement \| undefined }`) — _TODO: document this event._
- `export-start` (`{ snapshotId: string }`) — _TODO: document this event._
- `playback-state` (`Readonly<{ timeMs: number; durationMs: number; paused: boolean; }>`) — _TODO: document this event._
- `snapshot-change` (`{ snapshotId: string; sequence: number; html: string }`) — _TODO: document this event._
- `snapshot-export` (`{ snapshotId: string; filename: string; byteSize: number; durationMs: number; durationSeconds: number; width: number; height: number; fps: number; mimeType: string; url: string }`) — _TODO: document this event._
- `task-change` (`{ taskId: any; runId: any; status: any }`) — _TODO: document this event._

### `ef-asset-rail`

Session media chips and import controls for the shared composition.

### `ef-canvas`

Adds a selection and hover overlay to a composition's DOM subtree, with click-to-select, drag-to-move, and corner-resize.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `readonly` | `readonly` | boolean | `false` | Disables selection/drag/resize/rotate interaction; overlays remain visible but non-interactive. |
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**Slots**

- (default slot) — Composition elements registered with the canvas for selection, drag, and resize actions.

**Fires**

- `canvas-transform` (`{ elementId: string }`) — Fires when a drag, resize, or rotate gesture on a selection box ends.

### `ef-canvas-selection-box`

This element draws one selection or hover box.

### `ef-composition-thumbnail-strip`

This element is a nested-composition filmstrip.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | number | — | Trimmed clip duration in seconds, used to lay out thumbnail slots. |
| `height` | `height` | number | — | Height of the strip in pixels (defaults to the element's rendered height, or 32). |
| `pixels-per-second` | `pixelsPerSecond` | number | `100` | Zoom level — pixels rendered per second of composition time. |
| `scroll-left` | `scrollLeftInClip` | number | — | Clip-local scroll offset of the timeline viewport's left edge. |
| `thumbnail-spacing-px` | `thumbnailSpacingPx` | number | — | Minimum spacing between thumbnails in pixels (defaults to `thumbnailWidth`). |
| `thumbnail-width` | `thumbnailWidth` | number | — | Width of each thumbnail in pixels (defaults to a value derived from `height`). |
| `viewport-width` | `viewportWidth` | number | — | Visible viewport width in pixels, used to virtualize thumbnail generation. |

**CSS parts**

- `canvas` — This part is the canvas that renders the filmstrip.

### `ef-controls`

The `<ef-controls target="#preview">` element works as a proxy container.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element descendant controls resolve playback through by default. |

### `ef-dial`

This is a circular dial that a user drags to set a `value` between 0 and 360 degrees.

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--dial-stroke` | `var(--ef-color-border, rgba(255,255,255,0.16))` | Color of the dial's outer ring and tick marks' base stroke. |
| `--dial-tick` | `var(--ef-color-border-subtle, rgba(255,255,255,0.08))` | Color of the four cardinal tick marks. |

**CSS parts**

- `container` — The circular background of the dial.
- `handle` — A draggable knob that shows the current value.
- `value` — The numeric readout at the center of the dial.

**Fires**

- `change` (`{ value: number }`) — Fires each time the user drags the dial to a new value.

### `ef-fit-scale`

This element is a light DOM container.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `paused` | `paused` | boolean | `false` | Pauses automatic scale recalculation. |

### `ef-fullscreen`

This element toggles the browser Fullscreen API on a target element.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target that contains the slotted `enter` and `exit` content.

**Slots**

- `slot="enter"` — Shown when the target element is not in fullscreen mode. Click the target to enter fullscreen.
- `slot="exit"` — Shown while the target element is in fullscreen mode. Click the target to exit fullscreen.

### `ef-hierarchy`

This tree is aware of the DOM composition.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `header` | `header` | string | `""` | Header text shown above the tree (when `show-header`). |
| `show-header` | `showHeader` | boolean | `false` | Whether to show the header row. |
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--hierarchy-bg` | `var(--ef-color-bg)` | Background color of the tree container. |
| `--hierarchy-border` | `var(--ef-color-border)` | Border color (header divider). |
| `--hierarchy-drop-indicator` | `var(--ef-color-primary)` | Color of the drag-and-drop reorder indicator line. |
| `--hierarchy-hover-bg` | `var(--ef-color-border-subtle)` | Row background color on hover. |
| `--hierarchy-selected-bg` | `var(--ef-color-primary-subtle, rgba(110,168,254,0.18))` | Row background color when selected. |
| `--hierarchy-text` | `var(--ef-color-text)` | Text color. |

**CSS parts**

- `header` — The optional header above the tree items. This part appears when the `show-header` attribute is set.
- `list` — The outer container that holds the hierarchy tree.

**Fires**

- `hierarchy-highlight` (`{ element: Element \| null }`) — Fires when the highlighted element changes, for example when the user hovers over it in `ef-canvas`. This event fires through `EFHierarchyElement.setHighlighted`.
- `hierarchy-reorder` (`{ sourceId: string; targetId: string; position: "before" \| "after" \| "inside" }`) — Fires when the user drags a row to a new position.
- `hierarchy-select` (`{ elementId: string \| null }`) — Fires when the user clicks an element row, or when a script calls `EFHierarchyElement.select` directly.

**Methods**

- `select(elementId: string | null): void` — Select an element by its ID. Pass `null` instead to clear the selection.
- `getSelectedElementId(): string | null` — Returns the ID of the first selected element. Returns `null` if nothing is selected.
- `getHighlightedElement(): Element | null` — Returns the element currently highlighted through `setHighlighted`. Returns `null` if no element is highlighted.
- `setHighlighted(el: Element | null): void` — Sets the element that is highlighted from outside this element. For example, code can call this when the user hovers over the element in `ef-canvas`. This method also dispatches the `hierarchy-highlight` event.

### `ef-hierarchy-item`

This element renders one row for `EFHierarchyElement`.

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--hierarchy-drop-indicator` | `#3b82f6` | Color of the drag-and-drop reorder indicator line. |
| `--hierarchy-indent` | `0.75rem` | Indent width per nesting level. |
| `--hierarchy-item-font-size` | `0.75rem` | Row label font size. |
| `--hierarchy-item-height` | `1.5rem` | Row height. |
| `--hierarchy-item-padding-left` | `0.5rem` | Row left padding. |

**CSS parts**

- `badge` — The badge span that shows the element type.
- `children` — The wrapper for nested child items.
- `label` — The span that shows the element name.
- `row` — The container for this item's row. This part receives the `data-focused` and `data-selected` attributes.

### `ef-mute`

A click on this element toggles mute.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target that contains the slotted `muted` and `unmuted` content.

**Slots**

- `slot="muted"` — Shown while the target is muted. Click the target to unmute it.
- `slot="unmuted"` — Shown while the target is unmuted. Click the target to mute it.

### `ef-overlay-item`

This element is a passive overlay item.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `element-id` | `elementId` | string | — | ID (matched against `data-element-id`/`data-timegroup-id`) of the target element this overlay item tracks. |

**Slots**

- (default slot) — This slot holds the content that appears over the target element.

**Fires**

- `position-changed` (`{ x: number; y: number; width: number; height: number; rotation: number; }`) — This event fires when the target element's position, size, or rotation changes by more than 0.01px.

### `ef-overlay-layer`

This element is an overlay container.

**Slots**

- (default slot) — This slot accepts one or more `ef-overlay-item` or `ef-transform-handles` elements.

### `ef-pause`

This element hides itself while the target is paused.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target that contains the slotted icon or label content.

**Slots**

- (default slot) — Place your own button or icon element here. Click it to pause playback.

### `ef-pip`

This element is a Picture-in-Picture toggle.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target that contains the slotted `enter` and `exit` content.

**Slots**

- `slot="enter"` — Shown when the target is not in Picture-in-Picture mode. Click the target to enter Picture-in-Picture mode.
- `slot="exit"` — Shown while the target is in Picture-in-Picture mode. Click the target to exit Picture-in-Picture mode.

### `ef-play`

This element hides itself while the target plays.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target that contains the slotted icon or label content.

**Slots**

- (default slot) — Place your own button or icon element here. Click it to start playback.

### `ef-preview`

This is a thin passthrough container.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `loop` | `loop` | boolean | `false` | When set, forwarded onto the nested composition root so a docs `<Preview loop>` wraps playback without putting `loop` on the timegroup. |

**Fires**

- `focus-changed` (`{ element: HTMLElement \| null }`) — Fires when the hovered element changes. The `detail.element` field holds the new element, or `null` when nothing is focused.

### `ef-recorder`

Screen and camera as live H.264/AAC MP4 captures.

**Fires**

- `recording-state` (`{ which: "screen" \| "camera"; live: boolean }`) — _TODO: document this event._
- `workspace-error` (`string`) — _TODO: document this event._

### `ef-resolution`

This element is a resolution picker for the inline CSS `width` and `height` styles of a `target` element.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-color-surface` | `rgba(0, 0, 0, 0.6)` | Fallback background color source for `--ef-resolution-bg` (not currently part of the shared theme token set). |
| `--ef-resolution-bg` | `var(--ef-color-surface, rgba(0, 0, 0, 0.6))` | Background color of the dropdown/inputs. |
| `--ef-resolution-border-color` | `var(--ef-color-border, rgba(255, 255, 255, 0.2))` | Border color of the dropdown/inputs. |
| `--ef-resolution-color` | `var(--ef-color-text, #fff)` | Text color. |
| `--ef-resolution-font-size` | `12px` | Font size of the dropdown/inputs. |

**CSS parts**

- `height-input` — The custom height number input. This part appears only in custom mode.
- `select` — The dropdown list of preset resolutions.
- `separator` — The "×" symbol between the width and height inputs.
- `width-input` — The custom width number input. This part appears only in custom mode.

**Fires**

- `resolution-change` (`{ width: number; height: number }`) — Fires with a `{ width, height }` detail when the resolution changes. The change can come from a preset choice or a custom width and height input.

### `ef-scrubber`

This element is a playhead scrubber.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `container-width` | `containerWidth` | number | — | Explicit container width in pixels, used in vertical orientation. |
| `current-time-ms` | `currentTimeMs` | number | — | Current playback time in milliseconds. |
| `duration-ms` | `durationMs` | number | — | Total duration in milliseconds. |
| `fps` | `fps` | number | — | Frame rate used for frame-quantized calculations. |
| `orientation` | `orientation` | "horizontal" \\| "vertical" | — | Layout direction. |
| `pixels-per-second` | `pixelsPerSecond` | number | — | Zoom level — pixels rendered per second of composition time. |
| `raw-scrub-time-ms` | `rawScrubTimeMs` | number \| null | — | Unquantized scrub position in milliseconds, updated live during a drag. |
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |
| `zoom-scale` | `zoomScale` | number | — | Zoom multiplier applied to vertical (timeline) scrubber sizing. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-scrubber-background` | `var(--ef-color-border, rgba(255, 255, 255, 0.2))` | Unfilled track color. |
| `--ef-scrubber-handle-size` | `12px` | Diameter of the draggable handle. |
| `--ef-scrubber-height` | `4px` | Track thickness. |
| `--ef-scrubber-progress-color` | `var(--ef-color-primary, #fff)` | Filled (progress) track color. |

**CSS parts**

- `handle` — This part is the draggable circular knob.
- `playhead` — This part is the vertical line at the current time position.
- `progress` — This part is the filled portion. It shows the current position.
- `scrubber` — This part is the outer track container.

**Fires**

- `seek` (`number`) — This event fires when the user drags the scrubber to a new position.

### `ef-thumbnail-strip`

This element is a video filmstrip with the same zoom and scroll behavior as the old `EFThumbnailStrip`.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | number | — | Trimmed clip duration in seconds, used to lay out thumbnail slots. |
| `height` | `height` | number | — | Height of the strip in pixels (defaults to the element's rendered height, or 32). |
| `pixels-per-second` | `pixelsPerSecond` | number | `100` | Zoom level — pixels rendered per second of composition time. |
| `scroll-left` | `scrollLeftInClip` | number | — | Clip-local scroll offset of the timeline viewport's left edge. |
| `sourcein` | `sourcein` | string | — | Start time within the source video (CSS time, e.g. `"1.5s"`), mirrored from the source `<ef-video>`. |
| `sourceout` | `sourceout` | string | — | End time within the source video (CSS time), mirrored from the source `<ef-video>`. |
| `src` | `src` | string | `""` | URL of the source video file to generate thumbnails from. |
| `thumbnail-spacing-px` | `thumbnailSpacingPx` | number | — | Minimum spacing between thumbnails in pixels (defaults to `thumbnailWidth`). |
| `thumbnail-width` | `thumbnailWidth` | number | — | Width of each thumbnail in pixels (defaults to a value derived from `height`). |
| `trimend` | `trimend` | string | — | Trims this much off the end of the clip (CSS time), mirrored from the source `<ef-video>`. |
| `trimstart` | `trimstart` | string | — | Trims this much off the start of the clip (CSS time), mirrored from the source `<ef-video>`. |
| `variants` | `variants` | string | `""` | Adaptive variant ladder URL, mirrored from the source `<ef-video>`. |
| `viewport-width` | `viewportWidth` | number | — | Visible viewport width in pixels, used to virtualize thumbnail generation. |

**CSS parts**

- `canvas` — This part is the canvas that renders the filmstrip.

### `ef-time-display`

This element formats the `currentTime` and `duration` values, in seconds, from the resolved `PlaybackBridge`.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-font-family` | `system-ui` | Font family (not currently part of the shared theme token set). |
| `--ef-font-size-xs` | `0.75rem` | Font size (not currently part of the shared theme token set). |

**CSS parts**

- `time` — The span that shows the formatted current time and duration text.

### `ef-timeline`

This element renders the hierarchy and the track rows for a composition.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `follow-playhead` | `followPlayhead` | boolean | `true` | Auto-scrolls the timeline to keep the playhead visible during active playback. |
| `hierarchy-width` | `labelWidth` | number | `160` | Width of the layer hierarchy panel in pixels. |
| `pixels-per-second` | `pixelsPerSecond` | number | `100` | Zoom level — pixels rendered per second of composition time. |
| `row-height` | `rowHeight` | number | `28` | Height of each track row in pixels. |
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `scrub-overlay` — This part is the full-area overlay. It captures pointer drags while the user scrubs.

### `ef-timeline-row`

This element renders one timeline row.

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--trim-handle-width` | `6px` | Overrides the nested `<ef-trim-handles>`'s own `--trim-handle-width` for clips rendered inside this row. |

**CSS parts**

- `bar` — This part is the colored clip bar.
- `label` — This part is the row's label area. It shows the element name, an icon, and detail text.
- `track` — This part is the row's track area. It displays the clip bar.

**Fires**

- `timeline-select` (`{ elementId: string }`) — This event fires when the user clicks this row.

### `ef-timeline-ruler`

This element is a time ruler with tick marks and second labels.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | number | — | Total duration in seconds. |
| `duration-ms` | `durationMs` | number | — | Total duration in milliseconds, used when not provided via `duration` (Motion Designer timelines). |
| `fps` | `fps` | number | `30` | Frame rate — determines when individual frame tick marks become visible. |
| `pixels-per-second` | `pixelsPerSecond` | number | `100` | Zoom level — pixels rendered per second of composition time. |
| `zoom-scale` | `zoomScale` | number | — | Zoom multiplier used to derive `effectivePixelsPerSecond` when `duration-ms` is set. |

**CSS parts**

- `canvas` — This part is the tick-mark canvas.
- `container` — This part is the outer ruler wrapper.

### `ef-toggle-loop`

A click on this element toggles loop mode on the resolved `PlaybackBridge`.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target. This part sits directly on the `<slot>` element.

**Slots**

- (default slot) — Place your own button or icon element here. Click it to toggle loop mode.

### `ef-toggle-play`

A click on this element toggles between play and pause.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS parts**

- `button` — The click target that contains the slotted `play` and `pause` content.

**Slots**

- `slot="pause"` — Shown while the target plays. Click the target to pause it.
- `slot="play"` — Shown while playback is paused. Click the target to start playback.

### `ef-transform-handles`

This element is a selection overlay with drag, resize, and optional rotation handles.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `canvas-scale` | `canvasScale` | number | `1` | Current canvas zoom scale, used to keep handle hit areas a consistent screen size. |
| `corners-only` | `cornersOnly` | boolean | `false` | Only shows corner resize handles, hiding edge handles. |
| `enable-drag` | `enableDrag` | boolean | `true` | Allows dragging the selection by its body. |
| `enable-resize` | `enableResize` | boolean | `true` | Shows resize handles. |
| `enable-rotation` | `enableRotation` | boolean | `false` | Shows a rotation handle. |
| `lock-aspect-ratio` | `lockAspectRatio` | boolean | `false` | Constrains resizing to the original aspect ratio. |
| `min-size` | `minSize` | number | — | Minimum width/height in pixels during resize. |
| `rotation-step` | `rotationStep` | number | — | Snap increment in degrees while rotating. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-transform-handles-border-color` | `var(--ef-color-primary)` | Outline color of the bounding box overlay. |
| `--ef-transform-handles-dragging-border-color` | `var(--ef-color-primary)` | Bounding box outline color while dragging. |
| `--ef-transform-handles-handle-border-color` | `var(--ef-color-primary)` | Resize handle border color. |
| `--ef-transform-handles-handle-color` | `var(--ef-color-bg-elevated)` | Resize handle fill color. |
| `--ef-transform-handles-rotate-handle-color` | `var(--ef-color-success)` | Rotation handle color. |

**CSS parts**

- `drag-area` — This part is an invisible drag surface that covers the overlay. It appears only when `enable-drag` is true.
- `handle` — This part matches every resize handle. There are eight handles by default, or four when `corners-only` is true.
- `handle-e` — This part is the resize handle on the east edge.
- `handle-n` — This part is the resize handle on the north edge.
- `handle-ne` — This part is the resize handle in the northeast corner.
- `handle-nw` — This part is the resize handle in the northwest corner.
- `handle-s` — This part is the resize handle on the south edge.
- `handle-se` — This part is the resize handle in the southeast corner.
- `handle-sw` — This part is the resize handle in the southwest corner.
- `handle-w` — This part is the resize handle on the west edge.
- `overlay` — This part is the outer bounding box that sits over the selected element.
- `rotate-handle` — This part is the hit area of the rotation handle. It appears only when `enable-rotation` is true.
- `rotate-handle-circle` — This part is the visible circular knob inside the rotation handle.

**Fires**

- `bounds-change` (`{ bounds: { x: number; y: number; width: number; height: number; rotation?: number; } }`) — This event fires on every pointer move during a drag or a resize action.
- `rotation-change` (`{ rotation: number }`) — This event fires during a rotation drag.

### `ef-tree`

This element is a generic, data-driven tree.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `expand-all` | `expandAll` | boolean | `true` | Expands all items by default. |
| `header` | `header` | string | `""` | Header text shown above the tree (when `show-header`). |
| `selected-id` | `selectedId` | string \| null | — | ID of the currently selected item. |
| `show-header` | `showHeader` | boolean | `false` | Whether to show the header row. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--tree-bg` | `var(--ef-color-bg)` | Background color of the tree container. |
| `--tree-border` | `var(--ef-color-border)` | Border color. |
| `--tree-hover-bg` | `var(--ef-color-border-subtle)` | Row background color on hover. |
| `--tree-selected-bg` | `var(--ef-color-primary-subtle, rgba(110,168,254,0.18))` | Row background color when selected. |
| `--tree-text` | `var(--ef-color-text)` | Text color. |

**CSS parts**

- `container` — This part is the outer tree wrapper.
- `empty` — This part is the empty-state message.
- `header` — This part is the optional header. It appears when `show-header` is true.

**Fires**

- `tree-select` (`{ id: string \| null; item: TreeItem \| null }`) — This event fires when the user clicks a row.

### `ef-tree-item`

This element renders one row and a recursive `children` container, for `EFTreeElement`.

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--tree-expand-icon-size` | `1rem` | Size of the expand/collapse chevron icon. |
| `--tree-icon-gap` | `0.25rem` | Gap between the icon and label. |
| `--tree-indent` | `1rem` | Indent width per nesting level. |
| `--tree-item-font-size` | `0.75rem` | Row label font size. |
| `--tree-item-height` | `1.5rem` | Row height. |
| `--tree-item-padding-left` | `0.5rem` | Row left padding. |
| `--tree-item-padding-right` | `0.5rem` | Row right padding. |

**CSS parts**

- `children` — This part is the wrapper around the nested child items. It receives the `data-collapsed` attribute.
- `expand-icon` — This part is the expand and collapse chevron.
- `icon` — This part is the optional item icon.
- `label` — This part is the item label text.
- `row` — This part is the item row. It receives the `data-selected` attribute.

### `ef-trim-handles`

This element renders trim-in and trim-out handles, in seconds.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `element-id` | `elementId` | string | `""` | ID of the element these trim handles edit, included in the `trim-change` event detail. |
| `intrinsic-duration` | `intrinsicDuration` | number | — | Untrimmed source duration in seconds, used to compute drag bounds. |
| `mode` | `mode` | "standalone" \\| "track" | — | `standalone` (full overlay + draggable region) or `track` (handles pinned at container edges, for use inside a timeline track). |
| `pixels-per-second` | `pixelsPerSecond` | number \| null | — | Zoom level — pixels rendered per second of composition time. |
| `seek-target` | `seekTarget` | string | `""` | ID of a temporal element to seek as the user drags a handle. |
| `show-overlays` | `showOverlays` | boolean | `true` | Shows dimmed overlays over the trimmed-away portions. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--trim-handle-active-color` | `#3b82f6` | Handle color while hovered or dragging. |
| `--trim-handle-border-radius-end` | `0 2px 2px 0` | Border radius of the end (right) handle's visible knob. |
| `--trim-handle-border-radius-start` | `2px 0 0 2px` | Border radius of the start (left) handle's visible knob. |
| `--trim-handle-color` | `rgba(255, 255, 255, 0.7)` | Handle color at rest. |
| `--trim-handle-width` | `8px` | Width of each trim handle's hit area. |
| `--trim-overlay-color` | `rgba(0, 0, 0, 0.4)` | Color of the dimmed overlay drawn over trimmed-away regions. |
| `--trim-selected-border-color` | `transparent` | Color of the selection indicator border (standalone mode). |
| `--trim-selected-border-width` | `0px` | Thickness of the selection indicator border (standalone mode). |

**CSS parts**

- `handle` — This part matches both trim handles, the start handle and the end handle.
- `handle-end` — This part is the end trim handle, on the right.
- `handle-inner` — This part is the visible knob inside each trim handle.
- `handle-start` — This part is the start trim handle, on the left.
- `overlay` — This part matches both dimmed overlays. Each overlay covers a trimmed-away portion.
- `overlay-end` — This part is the dimmed overlay over the trimmed-away end portion.
- `overlay-start` — This part is the dimmed overlay over the trimmed-away start portion.
- `region` — This part is the draggable middle region. It appears only in standalone mode.
- `selected-border` — This part matches the selection indicator's borders. They appear only in standalone mode.
- `selected-border-bottom` — This part is the bottom border of the selection indicator.
- `selected-border-top` — This part is the top border of the selection indicator.

**Slots**

- `slot="handle-end"` — This slot holds custom content for the end trim handle's visible knob. The end handle sits on the right.
- `slot="handle-start"` — This slot holds custom content for the start trim handle's visible knob. The start handle sits on the left.

**Fires**

- `trim-change` (`{ elementId: string; type: "start" \| "end" \| "region"; value: { start: number; end: number } }`) — This event fires continuously while the user drags a trim handle or the region.
- `trim-change-end` (`{ elementId: string; type: "start" \| "end" \| "region" }`) — This event fires once when the user releases a trim handle drag.

### `ef-volume`

This element is a range slider with values from 0 to 1.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `target` | `target` | string | `""` | ID of the target element this component controls or reads from. |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-volume-fill-color` | `var(--ef-color-primary, #fff)` | Filled (progress) track color. |
| `--ef-volume-height` | `4px` | Track and thumb height. |
| `--ef-volume-track-color` | `var(--ef-color-border, rgba(255, 255, 255, 0.2))` | Unfilled track color. |

**CSS parts**

- `slider` — The native `<input type="range">` volume slider element.

### `ef-waveform-strip`

This element is a timeline waveform strip.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `color` | `color` | string | — | Waveform color (any valid CSS color value); defaults to the audio track's theme color. |
| `duration` | `duration` | number | — | Trimmed clip duration in seconds, used to lay out the waveform. |
| `height` | `height` | number | — | Height of the strip in pixels (defaults to the element's rendered height, or 32). |
| `media` | `media` | "audio" \\| "video" | — | Source element kind — determines the hidden decoder element used. |
| `pixels-per-second` | `pixelsPerSecond` | number | `100` | Zoom level — pixels rendered per second of composition time. |
| `scroll-left` | `scrollLeftInClip` | number | — | Clip-local scroll offset of the timeline viewport's left edge — matches `ef-thumbnail-strip`. |
| `sourcein` | `sourcein` | string | — | Start time within the source (CSS time, e.g. `"1.5s"`), mirrored from the source element. |
| `sourceout` | `sourceout` | string | — | End time within the source (CSS time), mirrored from the source element. |
| `src` | `src` | string | `""` | URL of the source audio/video file to decode a waveform envelope from. |
| `trimend` | `trimend` | string | — | Trims this much off the end of the clip (CSS time), mirrored from the source element. |
| `trimstart` | `trimstart` | string | — | Trims this much off the start of the clip (CSS time), mirrored from the source element. |
| `variants` | `variants` | string | — | Adaptive variant ladder URL, mirrored from the source `<ef-audio>`/`<ef-video>`. |
| `viewport-width` | `viewportWidth` | number | — | Visible viewport width in pixels, used to virtualize waveform painting. |

**CSS parts**

- `canvas` — This part is the canvas that renders the waveform.

### `ef-workbench`

This element composes a hierarchy panel, a canvas and selection view, a timeline, and transport controls into one panel layout, in DOM preview mode only.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `rendering` | `rendering` | boolean | `false` | True while a native render host (`EF_FRAMEGEN`) owns frame capture — collapses the workbench to just the bare `.stage` (no toolbar/sidebar/ transport/timeline chrome). |
| `resolution` | `resolution` | string | `"1920x1080"` | Composition's true rendered resolution, as `"WIDTHxHEIGHT"` (e.g. `"1920x1080"`, `"1080x1920"`). |

**CSS custom properties**

| Custom property | Default | Description |
|---|---|---|
| `--ef-color-danger` | `#dc2626` | Color for destructive actions and error states. |
| `--ef-color-hover` | `#333` | Hover background color for toolbar and zoom buttons. |
| `--ef-color-success` | `#059669` | Color for success states in the export popover. |
| `--ef-color-text-subtle` | `var(--ef-color-text-muted)` | Secondary text color for export popover labels. |
| `--ef-color-warning` | `#d97706` | Color for warning and cancelled states. |
| `--ef-workbench-sidebar-width` | `260px` | Width of the left hierarchy panel. |
| `--ef-workbench-timeline-height` | `260px` | Height of the bottom timeline panel. |

**Slots**

- (default slot) — This slot holds the composition. The composition is a light-DOM `<ef-configuration>`, `<ef-canvas>`, or `<ef-timegroup>` element, and the workbench auto-wraps it as needed.
- `slot="toolbar-end"` — Extension point at the right end of the header toolbar, after the built-in theme/export controls. Assign elements with `slot="toolbar-end"`.
- `slot="toolbar-start"` — Extension point at the left end of the header toolbar. Assign elements with `slot="toolbar-start"`. They stay light-DOM children of `<ef-workbench>` (so page CSS and the theme's `--ef-color-*` custom properties still reach them), and hide with the rest of the editor chrome in render mode.

**Fires**

- `export-complete` (`{ /** Omitted when a custom `target` was supplied. */ buffer?: ArrayBuffer; mimeType: string; }`) — This event fires once, when an export finishes successfully, with a `RenderTimegroupToVideoResult` detail value.
- `export-error` (`unknown`) — This event fires if an export throws an error. Its detail value holds the thrown error.
- `export-progress` (`{ frame: number; totalFrames: number; /** Composition time (seconds) just rendered. */ time: number; /** Total exported duration (seconds), i.e. `to - from`. */ duration: number; /** Wall-clock milliseconds since the render started. */ elapsedMs: number; /** * Estimated wall-clock milliseconds remaining, from the mean per-frame * cost so far. `0` before the first frame lands. */ estimatedRemainingMs: number; /** * Composition seconds rendered per wall-clock second. Above `1` means * the export is running faster than realtime. `0` before the first * frame lands. */ speedMultiplier: number; /** * Live thumbnail of the last captured frame, redrawn in place every * {@link RenderTimegroupToVideoOptions.progressPreviewInterval} frames. * The same canvas instance is passed on every progress callback — embed * it directly (e.g. append it to a status popover) rather than copying. * Omitted when `progressPreviewInterval` is `0`. */ framePreviewCanvas?: HTMLCanvasElement; }`) — This event fires repeatedly during an export, with a `RenderProgress` detail value that holds the frame count and the total frame count.
- `export-start` (`unknown`) — This event fires once, when `EFWorkbenchElement.exportVideo` begins.

**Methods**

- `exportVideo(options?: RenderTimegroupToVideoOptions): Promise<RenderTimegroupToVideoResult>` — Renders the composition to an MP4, through an offscreen `createRenderClone` and `renderTimegroupToVideo` call. By default it renders at this workbench's `resolution`. The live, interactive preview stays untouched. It dispatches bubbling `export-start`, `export-progress`, `export-complete`, and `export-error` events, so surrounding UI can show progress with no polling. This method returns the encoded buffer. The toolbar Export button also downloads the buffer as an `.mp4` file. See `.runToolbarExport` for that download logic.
  - `options.width` (optional): `number` — The output width, in pixels. Defaults to `timegroup.getBoundingClientRect()` width.
  - `options.height` (optional): `number` — The output height, in pixels. Defaults to `timegroup.getBoundingClientRect()` height.
  - `options.fps` (optional): `number` — The output frame rate. Defaults to `timegroup.fps`.
  - `options.from` (optional): `number` — The start of the export range, in composition seconds. Defaults to `0`.
  - `options.to` (optional): `number` — The end of the export range, in composition seconds. Defaults to the full duration.
  - `options.videoCodec` (optional): `"avc" \| "hevc" \| "vp9" \| "av1" \| "vp8" \| "prores"` — The output video codec. Defaults to `"avc"`.
  - `options.audioCodec` (optional): `"aac" \| "opus" \| "mp3" \| "vorbis" \| "flac" \| "ac3" \| "eac3" \| "pcm-s16" \| "pcm-s16be" \| "pcm-s24" \| "pcm-s24be" \| "pcm-s32" \| "pcm-s32be" \| "pcm-f32" \| "pcm-f32be" \| "pcm-f64" \| "pcm-f64be" \| "pcm-u8" \| "pcm-s8" \| "ulaw" \| "alaw"` — The output audio codec. Defaults to `"aac"`.
  - `options.videoBitrate` (optional): `number \| Quality` — A raw bits-per-second number, or a mediabunny `Quality` preset (e.g. `QUALITY_HIGH`). Defaults to `QUALITY_HIGH`.
  - `options.audioBitrate` (optional): `number \| Quality` — A raw bits-per-second number, or a mediabunny `Quality` preset (e.g. `QUALITY_HIGH`). Defaults to `QUALITY_HIGH`.
  - `options.audioSampleRate` (optional): `number` — The sample rate for the mixed audio track. Defaults to 48000.
  - `options.includeAudio` (optional): `boolean` — Mixes and encodes an audio track when the composition has audio-capable leaves. Defaults to `true`. Set `false` for a silent (video-only) export.
  - `options.scale` (optional): `number` — Downscales the encoded output by this factor (`0.5` = half-size MP4). Frames are still captured at full `width`×`height` — so composition layout (`px` fonts, `vw` units, line wrapping) is unaffected — and then drawn into the smaller encode canvas, matching the legacy Lit pipeline's scale behavior. Defaults to `1`.
  - `options.progressPreviewInterval` (optional): `number` — Redraws `RenderProgress.framePreviewCanvas` every N frames. Defaults to `DEFAULT_PROGRESS_PREVIEW_INTERVAL`. Set `0` to omit the preview entirely and skip its `drawImage` cost.
  - `options.strictVideoPaint` (optional): `boolean` — Passes through to `seekForRender`. Defaults to `true` for final-render capture.
  - `options.prefetchHorizonSec` (optional): `number` — Sets how far ahead of the export playhead, in seconds, to open upcoming play-tier inputs. Defaults to `DEFAULT_EXPORT_PREFETCH_HORIZON_SEC`. Set `0` to disable prefetch and match the previous JIT-only behavior.
  - `options.capture` (optional): `FrameCaptureStrategy` — How frames are captured to the encode canvas. `"auto"` (default) uses native HTML-in-Canvas when the browser offers it, else the foreignObject serializer — both rasterize with the browser's own engine for browser-correct output. `"painter"` selects the fast approximate Canvas2D painter used for interactive previews. A failed correct path degrades to the painter for the remaining frames.
  - `options.target` (optional): `Target` — Overrides the default `BufferTarget`. For example, use an `AppendOnlyStreamTarget` for `EF_RENDER.renderStreaming`'s chunked CLI or Playwright output. When set, `result.buffer` is omitted, because the caller already consumed the bytes through the target. `fastStart` then defaults to `"fragmented"` instead of `"in-memory"`, since streaming targets cannot seek back to patch a trailing moov box.
  - `options.fastStart` (optional): `false \| "in-memory" \| "reserve" \| "fragmented"` — Sets mediabunny's moov-placement strategy. Defaults to `"in-memory"`, or to `"fragmented"` when a custom `target` is supplied.
  - `options.videoHardwareAcceleration` (optional): `"no-preference" \| "prefer-hardware" \| "prefer-software"` — `hardwareAcceleration` for the video encoder. Defaults to `"prefer-hardware"` (guarded by `VideoEncoder.isConfigSupported`, falling back to `"no-preference"` when no HW encoder exists): mediabunny's quantizer bitrate mode otherwise selects the software encoder, which measures ~8x slower than VideoToolbox on macOS.
  - `options.signal` (optional): `AbortSignal` — Aborts the render in progress.
  - `options.onProgress` (optional): `((progress: RenderProgress) => void)` — Called after each frame is encoded.
