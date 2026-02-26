---
name: composition
title: Video Composition
description: Create video compositions with Editframe using HTML web components or React. Supports video, audio, images, text, captions, transitions, and cloud rendering.
order: 10
license: MIT
metadata:
  author: editframe
  version: "2.0"
---

# Video Composition

Build video compositions with HTML web components (`<ef-timegroup>`, `<ef-video>`, etc.) or React (`<Timegroup>`, `<Video>`, etc.). Same composition model, same rendering pipeline — pick the syntax that fits your project.

Web component attributes use kebab-case (`sourcein`, `auto-init`). React props use camelCase (`sourceIn`, `autoInit`). Each element reference documents both.

## Quick Start

<!-- html-only -->

```html
<ef-configuration api-host="..." media-engine="local">
  <ef-timegroup mode="sequence" overlap="1s">
    <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
      <ef-video src="intro.mp4" class="size-full object-cover"></ef-video>
      <ef-text
        split="word"
        class="absolute top-8 left-8 text-white text-4xl font-bold"
        style="animation: 0.6s slide-up both; animation-delay: calc(var(--ef-word-index) * 80ms)"
      >Opening Title</ef-text>
    </ef-timegroup>
    <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
      <ef-video src="main.mp4" sourcein="10s" sourceout="15s" class="size-full"></ef-video>
      <ef-audio src="music.mp3" volume="0.3"></ef-audio>
    </ef-timegroup>
  </ef-timegroup>
</ef-configuration>
<style>
  @keyframes slide-up {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

<!-- /html-only -->

<!-- react-only -->

```tsx
import { Timegroup, Video, Text, Audio } from "@editframe/react";

export const MyVideo = () => (
  <Timegroup mode="sequence" overlap="1s" className="w-[1920px] h-[1080px]">
    <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
      <Video src="intro.mp4" className="size-full object-cover" />
      <Text
        split="word"
        className="absolute top-8 left-8 text-white text-4xl font-bold"
        style={{ animation: "0.6s slide-up both", animationDelay: "calc(var(--ef-word-index) * 80ms)" }}
      >Opening Title</Text>
    </Timegroup>
    <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
      <Video src="main.mp4" sourceIn="10s" sourceOut="15s" className="size-full" />
      <Audio src="music.mp3" volume={0.3} />
    </Timegroup>
  </Timegroup>
);
```

```css
@keyframes slide-up {
  from { transform: translateY(24px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

React requires a `TimelineRoot` wrapper — see [references/timeline-root.md](references/timeline-root.md).

<!-- /react-only -->

## Duration Units

`5s` (seconds) | `1000ms` (milliseconds) | `2m` (minutes)

## Getting Started

Create a project: `npm create @editframe` (see the `editframe-create` skill)

- [references/getting-started.md](references/getting-started.md) — Your first composition

## Motion

Motion is how compositions become video rather than presentations. These are the primary tools.

- [references/text.md](references/text.md) — Word/character splitting, stagger animations, `--ef-stagger-offset`
- [references/css-variables.md](references/css-variables.md) — `--ef-progress`, `--ef-duration`, time-driven CSS
- [references/scripting.md](references/scripting.md) — `addFrameTask` for per-frame canvas and procedural animation
- [references/transitions.md](references/transitions.md) — Crossfades, slides, zoom transitions between scenes
- [references/r3f.md](references/r3f.md) — React Three Fiber 3D integration

## Media Elements

- [references/video.md](references/video.md) — Video clips, trimming, effects
- [references/audio.md](references/audio.md) — Audio, volume
- [references/image.md](references/image.md) — Static images
- [references/captions.md](references/captions.md) — Subtitles with word highlighting
- [references/waveform.md](references/waveform.md) — Audio visualization

## Layout & Timing

- [references/timegroup.md](references/timegroup.md) — Container, sequencing, scenes
- [references/sequencing.md](references/sequencing.md) — Sequential scene playback
- [references/surface.md](references/surface.md) — Mirror another element
- [references/time-model.md](references/time-model.md) — How time propagates through the tree

## Rendering

- [references/render-to-video.md](references/render-to-video.md) — Export to MP4 in the browser
- [references/render-api.md](references/render-api.md) — Render API and custom render data
- [references/transcription.md](references/transcription.md) — Generate captions with WhisperX

See the `editframe-cli` skill for CLI rendering.

## React

- [references/timeline-root.md](references/timeline-root.md) — Required wrapper for React compositions
- [references/hooks.md](references/hooks.md) — useTimingInfo, usePanZoomTransform
- [references/use-media-info.md](references/use-media-info.md) — useMediaInfo hook

## Advanced

- [references/configuration.md](references/configuration.md) — Media engine and API host
- [references/server-rendering.md](references/server-rendering.md) — SSR with Next.js/Remix
- [references/entry-points.md](references/entry-points.md) — Package exports
- [references/events.md](references/events.md) — Custom event catalog
- [references/css-parts.md](references/css-parts.md) — Shadow DOM styling

## Styling

Elements use standard CSS/Tailwind. Position with `absolute`, size with `w-full h-full` or `size-full`.
