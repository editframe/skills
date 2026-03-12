---
name: editframe-editor-gui
description: "Build video editing interfaces with Editframe's GUI components. Assemble timeline, scrubber, filmstrip, preview, playback controls, and transform handles."
license: MIT
metadata:
  author: editframe
  version: 0.46.0
---


# Editor Toolkit

Build video editing interfaces by composing GUI components around a composition. The composition itself is built with the `composition` skill — these components provide the controls and views around it.

## Before opening any reference file, answer:

**What kind of editor does the user need?**

| Need | Start here |
|------|-----------|
| Just play/pause + seek | Minimal: `ef-preview` + `ef-controls` |
| Visual timeline of clips | Add `ef-filmstrip` |
| Layer panel (select/reorder) | Add `ef-hierarchy` |
| Full editor with all panels | Use `ef-workbench` |
| Canvas manipulation (drag/resize) | Add `ef-canvas` + `ef-transform-handles` |

Build editors incrementally — start minimal, add components only when needed.

## The Composition Model

Every editor has one composition (a `ef-timegroup` with an `id`). All GUI components reference it.

```
ef-preview              ← renders the composition
  └── ef-timegroup id="comp"   ← the composition

ef-controls target="comp"      ← connects to the composition by id
  ├── ef-toggle-play
  ├── ef-scrubber
  └── ef-time-display

ef-filmstrip target="comp"     ← visual timeline view
ef-hierarchy target="comp"     ← layer list
```

**The `target` attribute** connects any control or view to a composition outside its DOM ancestry. Without it, controls look up the DOM tree for the nearest timegroup.

## Progressive Levels

### Level 1 — Minimal (Preview + Controls)

```html
<ef-preview>
  <ef-timegroup id="comp" mode="sequence" class="w-[1920px] h-[1080px]">
    <!-- your composition -->
  </ef-timegroup>
</ef-preview>

<ef-controls target="comp" class="flex items-center gap-4">
  <ef-toggle-play></ef-toggle-play>
  <ef-time-display></ef-time-display>
  <ef-scrubber class="flex-1"></ef-scrubber>
  <ef-toggle-loop></ef-toggle-loop>
</ef-controls>
```

### Level 2 — Timeline (add Filmstrip)

```html
<ef-filmstrip target="comp" pixels-per-ms="0.1"></ef-filmstrip>
```

### Level 3 — Layers (add Hierarchy)

```html
<ef-hierarchy target="comp"></ef-hierarchy>
```

### Level 4 — Full Editor (Workbench)

`ef-workbench` provides a complete shell with named slots — no manual layout needed:

```html
<ef-workbench class="w-full h-screen">
  <ef-pan-zoom slot="canvas">
    <ef-fit-scale>
      <ef-timegroup mode="sequence" class="w-[1920px] h-[1080px]">
        <!-- composition -->
      </ef-timegroup>
    </ef-fit-scale>
  </ef-pan-zoom>

  <ef-hierarchy slot="hierarchy"></ef-hierarchy>

  <div slot="timeline" class="h-full flex flex-col">
    <ef-controls class="flex items-center gap-2 p-2">
      <ef-toggle-play></ef-toggle-play>
      <ef-time-display></ef-time-display>
      <ef-scrubber class="flex-1"></ef-scrubber>
    </ef-controls>
    <ef-filmstrip class="flex-1"></ef-filmstrip>
  </div>
</ef-workbench>
```

## Getting Started

- [references/editor-toolkit.md](references/editor-toolkit.md) — Full progressive guide with working examples

## Preview & Canvas

- [references/preview.md](references/preview.md) — Preview container with focus tracking
- [references/canvas.md](references/canvas.md) — Interactive canvas with selection and drag-and-drop
- [references/pan-zoom.md](references/pan-zoom.md) — Pan and zoom container with gestures
- [references/focus-overlay.md](references/focus-overlay.md) — Highlight focused element
- [references/fit-scale.md](references/fit-scale.md) — Responsive aspect-ratio scaling

## Playback Controls

- [references/controls.md](references/controls.md) — Context bridge for disconnected controls
- [references/play.md](references/play.md) — Play button
- [references/pause.md](references/pause.md) — Pause button
- [references/toggle-play.md](references/toggle-play.md) — Combined play/pause toggle
- [references/toggle-loop.md](references/toggle-loop.md) — Loop toggle

## Timeline

- [references/timeline.md](references/timeline.md) — Full-featured timeline editor
- [references/filmstrip.md](references/filmstrip.md) — Visual timeline with tracks
- [references/scrubber.md](references/scrubber.md) — Seek control
- [references/time-display.md](references/time-display.md) — Current time / duration display
- [references/timeline-ruler.md](references/timeline-ruler.md) — Time ruler with frame markers
- [references/trim-handles.md](references/trim-handles.md) — Interactive trim controls
- [references/thumbnail-strip.md](references/thumbnail-strip.md) — Video thumbnail preview strip

## Transform & Manipulation

- [references/transform-handles.md](references/transform-handles.md) — Resize and rotation handles
- [references/resizable-box.md](references/resizable-box.md) — Resizable container with drag handles
- [references/dial.md](references/dial.md) — Rotary angle input

## Overlay System

- [references/overlay-layer.md](references/overlay-layer.md) — Container for positioned overlays
- [references/overlay-item.md](references/overlay-item.md) — Track and follow target elements

## Editor Shells

- [references/workbench.md](references/workbench.md) — Full editor UI with preview, timeline, hierarchy, and export
- [references/hierarchy.md](references/hierarchy.md) — Layer panel with selection and drag-and-drop
- [references/active-root-temporal.md](references/active-root-temporal.md) — Display active root element ID
