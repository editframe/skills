---
name: elements-composition
description: Create video compositions with Editframe Elements. Use when working with ef-timegroup, ef-video, ef-audio, ef-image, ef-text, ef-captions, ef-waveform, ef-surface, building timelines, or generating captions/transcriptions.
license: MIT
metadata:
  author: editframe
  version: "1.0"
---

# Editframe Elements

## Quick Start

```html
<ef-configuration api-host="..." media-engine="local">
  <ef-timegroup mode="sequence" workbench>
    <!-- elements here -->
  </ef-timegroup>
</ef-configuration>
```

## Duration Units

`5s` (seconds) | `1000ms` (milliseconds) | `2m` (minutes)

## Elements

- [references/timegroup.md](references/timegroup.md) - Container, sequencing, scenes
- [references/video.md](references/video.md) - Video clips, trimming
- [references/audio.md](references/audio.md) - Audio, volume
- [references/image.md](references/image.md) - Static images
- [references/text.md](references/text.md) - Animated text
- [references/captions.md](references/captions.md) - Subtitles with word highlighting
- [references/waveform.md](references/waveform.md) - Audio visualization
- [references/surface.md](references/surface.md) - Mirror another element

## Tools

- [references/transcription.md](references/transcription.md) - Generate captions with WhisperX

## Scene Structure

```html
<ef-timegroup mode="sequence" workbench>
  <!-- Scene 1 -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="intro.mp4" class="size-full object-cover"></ef-video>
    <ef-text class="absolute top-8 text-white text-3xl">Title</ef-text>
  </ef-timegroup>

  <!-- Scene 2 -->
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="main.mp4" sourcein="10s" sourceout="15s" class="size-full"></ef-video>
    <ef-audio src="music.mp3" volume="0.3"></ef-audio>
  </ef-timegroup>
</ef-timegroup>
```

## Styling

Elements use standard CSS/Tailwind. Position with `absolute`, size with `w-full h-full` or `size-full`.
