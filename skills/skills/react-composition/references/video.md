---
title: Video Component
description: Display video clips with optional trimming and volume control in React
type: reference
nav:
  parent: "Components / Media"
  priority: 10
  related: ["audio", "image"]
api:
  properties:
    - name: src
      type: string
      required: true
      description: Video file URL
    - name: sourceIn
      type: string
      description: Absolute start time (e.g., "5s", "1000ms")
    - name: sourceOut
      type: string
      description: Absolute end time (e.g., "10s", "5000ms")
    - name: trimStart
      type: string
      description: Relative trim from start (e.g., "2s")
    - name: trimEnd
      type: string
      description: Relative trim from end (e.g., "3s")
    - name: muted
      type: boolean
      default: false
      description: Mute audio track
    - name: volume
      type: number
      default: 1
      description: Volume level (0.0 to 1.0)
    - name: className
      type: string
      description: CSS classes for styling
---

# Video

Display video clips with optional trimming.

## Import

```tsx
import { Video } from "@editframe/react";
```

## Basic Usage

```tsx
<Video src="/assets/clip.mp4" className="size-full object-cover" />
```

## Trimming Approaches

Two ways to trim video - choose based on your workflow:

### Absolute Trimming (sourceIn/sourceOut)

Show specific timestamps from source. Use when you know exact timecodes.

```tsx
{/* Show seconds 10-20 from source (10s clip) */}
<Video 
  src="/assets/long-video.mp4"
  sourceIn="10s"
  sourceOut="20s"
  className="size-full object-cover"
/>
```

### Relative Trimming (trimStart/trimEnd)

Remove time from start/end. Use when thinking "cut off X seconds".

```tsx
{/* Remove 2s from start, 3s from end */}
<Video 
  src="/assets/video.mp4"
  trimStart="2s"
  trimEnd="3s"
  className="size-full object-cover"
/>
```

**When to use each:**
- `sourceIn`/`sourceOut` - Working with timecode, precise frame references
- `trimStart`/`trimEnd` - UI builders, "how much to cut off" thinking

## With Volume Control

```tsx
<Video 
  src="/assets/clip.mp4"
  volume={0.5}
  className="size-full"
/>
```

## Muted Video

```tsx
<Video 
  src="/assets/clip.mp4"
  muted
  className="size-full object-cover"
/>
```

## Full Scene Example

```tsx
import { Timegroup, Video, Text } from "@editframe/react";

export const VideoScene = () => {
  return (
    <Timegroup mode="contain" className="absolute w-full h-full">
      <Video 
        src="/assets/background.mp4"
        sourceIn="5s"
        sourceOut="15s"
        className="size-full object-cover"
      />
      <Text className="absolute top-8 left-8 text-white text-3xl">
        Video Title
      </Text>
    </Timegroup>
  );
};
```

## Object Fit

Use Tailwind classes for positioning:

```tsx
{/* Cover - fills container, may crop */}
<Video src="/assets/video.mp4" className="size-full object-cover" />

{/* Contain - fits within container, may have letterbox */}
<Video src="/assets/video.mp4" className="size-full object-contain" />

{/* Fill - stretches to fill */}
<Video src="/assets/video.mp4" className="size-full object-fill" />
```

## Dynamic Videos

```tsx
interface VideoData {
  id: string;
  src: string;
  sourceIn: string;
  sourceOut: string;
}

const videos: VideoData[] = [
  { id: "1", src: "/assets/clip1.mp4", sourceIn: "0s", sourceOut: "5s" },
  { id: "2", src: "/assets/clip2.mp4", sourceIn: "3s", sourceOut: "8s" },
];

<Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
  {videos.map((video) => (
    <Timegroup key={video.id} mode="contain" className="absolute w-full h-full">
      <Video 
        src={video.src}
        sourceIn={video.sourceIn}
        sourceOut={video.sourceOut}
        className="size-full object-cover"
      />
    </Timegroup>
  ))}
</Timegroup>
```
