---
name: editor-gui
description: Build video editing interfaces using Editframe's GUI web components. Assemble timeline, scrubber, filmstrip, preview, and playback controls like lego bricks. Use when creating video editors, editing tools, or when user mentions timeline, scrubber, preview, playback controls, trim handles, or wants to build editing UIs.
---

# Editor GUI Components

Build bespoke video editing interfaces by composing discrete GUI components. Each component is a self-contained building block that connects to your composition via targets.

## Core Principle

GUI components are **lego bricks**. They don't contain content—they provide controls and views for content defined by Elements (EFTimegroup, EFVideo, EFText, etc.). Connect them using `target` attributes.

## Quick Start: Minimal Player

```html
<ef-timegroup id="my-video" mode="fixed" duration="5s">
  <ef-video src="/video.mp4" duration="5s"></ef-video>
</ef-timegroup>

<ef-controls target="my-video">
  <ef-toggle-play></ef-toggle-play>
  <ef-scrubber></ef-scrubber>
  <ef-time-display></ef-time-display>
</ef-controls>
```

## Component Reference

### Preview & Canvas

```html
<!-- Basic preview (renders composition at current time) -->
<ef-preview target="my-canvas"></ef-preview>

<!-- Canvas with pan/zoom container -->
<ef-pan-zoom>
  <ef-canvas id="my-canvas">
    <ef-timegroup>...</ef-timegroup>
  </ef-canvas>
</ef-pan-zoom>

<!-- Visual transform handles for selected elements -->
<ef-transform-handles></ef-transform-handles>
```

### Playback Controls

```html
<!-- Controls container (provides context to children) -->
<ef-controls target="my-timegroup">
  <!-- Individual controls -->
  <ef-play></ef-play>
  <ef-pause></ef-pause>
  <ef-toggle-play></ef-toggle-play>
  <ef-toggle-loop></ef-toggle-loop>
  <ef-scrubber></ef-scrubber>
  <ef-time-display></ef-time-display>
</ef-controls>

<!-- Or use controls standalone with explicit targets -->
<ef-toggle-play target="my-timegroup"></ef-toggle-play>
<ef-scrubber target="my-timegroup"></ef-scrubber>
```

#### Toggle Play with Custom Slots

```html
<ef-toggle-play>
  <button slot="play">▶ Play</button>
  <button slot="pause">⏸ Pause</button>
</ef-toggle-play>
```

### Timeline

```html
<!-- Full timeline with tracks, ruler, zoom -->
<ef-timeline 
  target="my-canvas"
  show-ruler
  show-playback-controls
  pixels-per-ms="0.1"
></ef-timeline>

<!-- Just the ruler -->
<ef-timeline-ruler target="my-canvas"></ef-timeline-ruler>

<!-- Trim handles for timeline editing -->
<ef-trim-handles></ef-trim-handles>
```

### Filmstrip

```html
<!-- Thumbnail strip navigation -->
<ef-filmstrip target="my-timegroup"></ef-filmstrip>

<!-- Thumbnail strip visualization (for tracks) -->
<ef-thumbnail-strip></ef-thumbnail-strip>
```

### Hierarchy Panel

```html
<!-- Element tree panel -->
<ef-hierarchy 
  target="my-canvas" 
  show-header 
  header="LAYERS"
></ef-hierarchy>
```

### Workbench (Full Editor Shell)

```html
<!-- Complete editing environment with slots -->
<ef-workbench>
  <ef-hierarchy slot="hierarchy" target="my-canvas"></ef-hierarchy>
  <ef-pan-zoom slot="canvas">
    <ef-canvas id="my-canvas">...</ef-canvas>
  </ef-pan-zoom>
  <ef-timeline slot="timeline" target="my-canvas"></ef-timeline>
</ef-workbench>

<!-- Or use shorthand on timegroup -->
<ef-timegroup workbench mode="fixed" duration="10s">
  ...
</ef-timegroup>
```

## React Wrappers

```tsx
import { 
  Preview, 
  Timeline, 
  Controls,
  Scrubber, 
  TogglePlay, 
  TimeDisplay,
  Filmstrip,
  Hierarchy,
  Workbench 
} from '@editframe/react';

function SimplePlayer({ timegroupId }) {
  return (
    <Controls target={timegroupId}>
      <TogglePlay />
      <Scrubber />
      <TimeDisplay />
    </Controls>
  );
}
```

## Composition Patterns

### Pattern 1: Minimal Preview + Controls

```tsx
import { Timegroup, Video, Controls, TogglePlay, Scrubber, TimeDisplay } from '@editframe/react';

export function VideoPlayer({ src }) {
  return (
    <div className="flex flex-col gap-2">
      <Timegroup id="player" mode="fixed" duration="10s">
        <Video src={src} duration="10s" style={{ width: '100%' }} />
      </Timegroup>
      
      <Controls target="player" className="flex items-center gap-2">
        <TogglePlay />
        <Scrubber className="flex-1" />
        <TimeDisplay />
      </Controls>
    </div>
  );
}
```

### Pattern 2: Timeline-Only Editor

```tsx
import { Canvas, Timegroup, Video, Timeline } from '@editframe/react';

export function TimelineEditor({ clips }) {
  return (
    <div className="flex flex-col h-screen">
      <Canvas id="editor" className="flex-1 bg-black">
        <Timegroup id="root" mode="sequence">
          {clips.map(clip => (
            <Video key={clip.id} src={clip.src} duration={clip.duration} />
          ))}
        </Timegroup>
      </Canvas>
      
      <Timeline 
        target="editor" 
        showRuler 
        showPlaybackControls 
        className="h-48 border-t"
      />
    </div>
  );
}
```

### Pattern 3: Filmstrip Navigator

```tsx
import { Timegroup, Video, Filmstrip, Controls, TogglePlay } from '@editframe/react';

export function FilmstripViewer({ src }) {
  return (
    <div className="flex flex-col gap-4">
      <Timegroup id="viewer" mode="fixed" duration="30s">
        <Video src={src} duration="30s" style={{ width: '100%' }} />
      </Timegroup>
      
      <Filmstrip target="viewer" className="h-16" />
      
      <Controls target="viewer" className="flex justify-center">
        <TogglePlay />
      </Controls>
    </div>
  );
}
```

### Pattern 4: Trim Tool

```tsx
import { Canvas, Timegroup, Video, Timeline, TrimHandles } from '@editframe/react';

export function TrimTool({ src, onTrim }) {
  return (
    <div className="flex flex-col">
      <Canvas id="trim-canvas" className="aspect-video bg-black">
        <Timegroup id="trim-root" mode="fixed" duration="10s">
          <Video src={src} duration="10s" />
        </Timegroup>
      </Canvas>
      
      <div className="relative">
        <Timeline target="trim-canvas" showRuler />
        <TrimHandles />
      </div>
    </div>
  );
}
```

### Pattern 5: Multi-Layer Editor with Hierarchy

```tsx
import { Workbench, Hierarchy, PanZoom, Canvas, Timegroup, Timeline } from '@editframe/react';

export function LayeredEditor({ children }) {
  return (
    <Workbench className="h-screen">
      <Hierarchy slot="hierarchy" target="main-canvas" showHeader header="LAYERS" />
      
      <PanZoom slot="canvas">
        <Canvas id="main-canvas">
          <Timegroup id="root" mode="contain" duration="10s">
            {children}
          </Timegroup>
        </Canvas>
      </PanZoom>
      
      <Timeline slot="timeline" target="main-canvas" showRuler showPlaybackControls />
    </Workbench>
  );
}
```

## Target Linking

GUI components connect to content using IDs:

```html
<!-- Content with ID -->
<ef-canvas id="my-canvas">
  <ef-timegroup id="my-root">...</ef-timegroup>
</ef-canvas>

<!-- GUI components target by ID -->
<ef-timeline target="my-canvas"></ef-timeline>
<ef-hierarchy target="my-canvas"></ef-hierarchy>
<ef-controls target="my-root"></ef-controls>
<ef-filmstrip target="my-root"></ef-filmstrip>
```

| Component | Target Type | Purpose |
|-----------|-------------|---------|
| Timeline | Canvas ID | Shows all tracks from canvas content |
| Hierarchy | Canvas ID | Shows element tree from canvas |
| Controls | Timegroup ID | Play/pause/seek the timegroup |
| Filmstrip | Timegroup ID | Thumbnail navigation for timegroup |
| Preview | Canvas ID | Renders canvas at current time |

## Styling

All components accept `className` for styling:

```tsx
<Scrubber className="h-2 rounded-full" />
<TogglePlay className="w-10 h-10 bg-white rounded-full" />
<Timeline className="h-48 bg-gray-900" />
```

Components use CSS custom properties for theming:

```css
ef-timeline {
  --ef-timeline-bg: #1a1a1a;
  --ef-timeline-track-bg: #2a2a2a;
  --ef-timeline-playhead: #ff0000;
}

ef-scrubber {
  --ef-scrubber-track: #333;
  --ef-scrubber-fill: #fff;
  --ef-scrubber-thumb: #fff;
}
```

## File Locations

```
elements/packages/elements/src/gui/
├── EFConfiguration.ts    # Root config wrapper
├── EFWorkbench.ts        # Full editor shell
├── EFControls.ts         # Control container
├── EFPlay.ts             # Play button
├── EFPause.ts            # Pause button  
├── EFTogglePlay.ts       # Play/pause toggle
├── EFToggleLoop.ts       # Loop toggle
├── EFScrubber.ts         # Time scrubber
├── EFTimeDisplay.ts      # Time display
├── EFFilmstrip.ts        # Thumbnail strip
├── EFPreview.ts          # Preview renderer
├── hierarchy/
│   └── EFHierarchy.ts    # Layer panel
└── timeline/
    ├── EFTimeline.ts     # Main timeline
    ├── EFTimelineRuler.ts # Time ruler
    └── EFTrimHandles.ts  # Trim handles

elements/packages/react/src/gui/
├── Workbench.ts          # React wrapper
├── Timeline.ts           # React wrapper
├── Controls.ts           # React wrapper
├── Scrubber.ts           # React wrapper
└── ...                   # All components have React wrappers
```

## Sandboxes

Test individual components:

```bash
elements/scripts/npm run sandbox
```

Browse to component sandboxes:
- `src/gui/EFScrubber.sandbox.ts`
- `src/gui/EFTimeline.sandbox.ts`
- `src/gui/EFFilmstrip.sandbox.ts`
- `src/gui/EFControls.sandbox.ts`
