---
name: react-composition
description: Create video compositions with @editframe/react React wrappers. Use when working with React components like Timegroup, Video, Audio, Image, Text, Captions, Waveform, Surface, Configuration, Preview, Controls, or building React-based video compositions with TypeScript.
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# @editframe/react

React wrapper components for Editframe Elements. Provides type-safe React components with hooks for building video compositions.

## Quick Start

```tsx
import { Timegroup, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup
      workbench
      className="w-[1920px] h-[1080px] bg-black"
      mode="sequence"
    >
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Text duration="5s" className="text-white text-4xl">
          Your video starts here
        </Text>
      </Timegroup>
    </Timegroup>
  );
};
```

## Duration Units

`5s` (seconds) | `1000ms` (milliseconds) | `2m` (minutes)

## Getting Started

- [references/getting-started.md](references/getting-started.md) - Create a React project
- [references/configuration.md](references/configuration.md) - Configuration component

## Element Components

- [references/timegroup.md](references/timegroup.md) - Container, sequencing, scenes
- [references/video.md](references/video.md) - Video clips, trimming
- [references/audio.md](references/audio.md) - Audio, volume
- [references/image.md](references/image.md) - Static images
- [references/text.md](references/text.md) - Animated text
- [references/captions.md](references/captions.md) - Subtitles with word highlighting
- [references/waveform.md](references/waveform.md) - Audio visualization
- [references/surface.md](references/surface.md) - Mirror another element

## Advanced Features

- [references/transitions.md](references/transitions.md) - Crossfades, slides, zoom transitions
- [references/css-variables.md](references/css-variables.md) - Dynamic animations with CSS variables
- [references/scripting.md](references/scripting.md) - JavaScript behavior with initializer and frameTask

## GUI Components

- [references/preview.md](references/preview.md) - Preview player
- [references/controls.md](references/controls.md) - Playback controls
- [references/workbench.md](references/workbench.md) - Full editor UI

## Hooks

- [references/hooks.md](references/hooks.md) - useTimingInfo, usePanZoomTransform

## Scene Structure

```tsx
import { Timegroup, Video, Text, Audio } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup workbench mode="sequence" overlap="1s" className="w-[1920px] h-[1080px]">
      {/* Scene 1 */}
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Video src="/assets/intro.mp4" className="size-full object-cover" />
        <Text className="absolute top-8 text-white text-3xl">Title</Text>
      </Timegroup>

      {/* Scene 2 with transition */}
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Video src="/assets/main.mp4" sourceIn="10s" sourceOut="15s" className="size-full" />
        <Audio src="/assets/music.mp3" volume={0.3} />
      </Timegroup>
    </Timegroup>
  );
};
```

## Styling

Components accept `className` prop for Tailwind/CSS styling. Position with `absolute`, size with `w-full h-full` or `size-full`.

## TypeScript

All components are fully typed with TypeScript. Props match the underlying web component attributes in camelCase.
