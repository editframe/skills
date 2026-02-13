---
title: Getting Started
description: Build your first HTML video composition with Editframe Elements
type: tutorial
nav:
  parent: "Quick Start"
  priority: 1
track: "getting-started"
track_step: 1
track_title: "Your First Composition"
next_steps: ["video"]
---

# Getting Started

Build your first video composition with Editframe Elements.

> **Note:** Need a project? Run `npm create @editframe -- html -d my-project -y` — see the `editframe-create` skill.

## Composition Structure

Every composition starts with an `ef-timegroup` root:

```html
<ef-timegroup mode="sequence" class="w-[1920px] h-[1080px] bg-black">
  <!-- scenes go here -->
</ef-timegroup>
```

The `mode` controls how child elements are timed.

### Step 1: Create a Scene

Add a fixed-duration scene with text:

```html
<ef-timegroup mode="sequence" class="w-[1920px] h-[1080px] bg-black">
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-text class="text-white text-4xl">Hello, Editframe!</ef-text>
  </ef-timegroup>
</ef-timegroup>
```

### Step 2: Add Media

Add video and audio to your scene:

```html
<ef-timegroup mode="sequence" class="w-[1920px] h-[1080px] bg-black">
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="/assets/intro.mp4" class="size-full object-cover"></ef-video>
    <ef-text class="absolute bottom-8 text-white text-2xl">Title</ef-text>
  </ef-timegroup>
</ef-timegroup>
```

### Step 3: Add More Scenes

Chain scenes in a sequence with overlap for transitions:

```html
<ef-timegroup mode="sequence" overlap="1s" class="w-[1920px] h-[1080px] bg-black">
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="/assets/intro.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  <ef-timegroup mode="fixed" duration="5s" class="absolute w-full h-full">
    <ef-video src="/assets/main.mp4" class="size-full object-cover"></ef-video>
    <ef-audio src="/assets/music.mp3" volume="0.3"></ef-audio>
  </ef-timegroup>
</ef-timegroup>
```

## Assets

Place media files in `src/assets/` and reference with `/assets/filename`:

```html
<ef-video src="/assets/video.mp4"></ef-video>
<ef-audio src="/assets/music.mp3"></ef-audio>
<ef-image src="/assets/logo.png"></ef-image>
```

## Render to Video

```bash
npx editframe render -o output.mp4
```

See the `editframe-cli` skill for full render options.
