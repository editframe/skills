---
title: Getting Started
description: Build your first React video composition with @editframe/react
type: tutorial
nav:
  parent: "Quick Start"
  priority: 0
---

# Getting Started

Build your first video composition with React.

> **Note:** Need a project? Run `npm create @editframe -- react -d my-project -y` — see the `editframe-create` skill.

## Basic Video Component

Create your composition in `src/Video.tsx`:

```tsx
import { Timegroup, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup
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

Wrap it with `TimelineRoot` in `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { TimelineRoot } from "@editframe/react";
import { Video } from "./Video";
import "@editframe/elements/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <TimelineRoot id="root" component={Video} />
);
```

**Important**: `TimelineRoot` is required for rendering. It ensures React hooks and state work correctly during video rendering. See [timeline-root.md](timeline-root.md) for details.

## Add Media

Place media files in `src/assets/` and reference with `/assets/filename`:

```tsx
import { Video, Audio, Image } from "@editframe/react";

<Video src="/assets/video.mp4" />
<Audio src="/assets/music.mp3" />
<Image src="/assets/logo.png" />
```

## Add Scenes

Chain scenes in a sequence:

```tsx
import { Timegroup, Video, Text, Audio } from "@editframe/react";

export const VideoComposition = () => {
  return (
    <Timegroup mode="sequence" overlap="1s" className="w-[1920px] h-[1080px]">
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Video src="/assets/intro.mp4" className="size-full object-cover" />
        <Text className="absolute top-8 text-white text-3xl">Title</Text>
      </Timegroup>
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Video src="/assets/main.mp4" className="size-full" />
        <Audio src="/assets/music.mp3" volume={0.3} />
      </Timegroup>
    </Timegroup>
  );
};
```

## Render to Video

```bash
npx editframe render -o output.mp4
```

See the `editframe-cli` skill for full render options.
