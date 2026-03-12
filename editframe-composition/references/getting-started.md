---
description: "Build your first HTML video composition with Editframe Elements — install the package, place elements, and render to MP4."
metadata:
  author: editframe
  version: 0.46.0
---


# Getting Started

Build your first video composition with Editframe Elements.

> **Note:** Need a project? Run `npm create @editframe -- html -d my-project -y` — see the `editframe-create` skill.
Build your first video composition with React.

> **Note:** Need a project? Run `npm create @editframe -- react -d my-project -y` — see the `editframe-create` skill.

## Composition Structure

Every composition starts with an `ef-timegroup` root:

```html
<ef-timegroup mode="sequence" class="w-[1920px] h-[1080px] bg-black">
  <!-- scenes go here -->
</ef-timegroup>
```

The `mode` controls how child elements are timed.

### Step 1: Start with Motion

The first thing a viewer sees should move. Add an animated title — every word slides up in sequence using `split="word"` and `--ef-word-index`:

```html live
<ef-timegroup mode="fixed" duration="3s" class="w-[720px] h-[400px] bg-black flex items-center justify-center">
  <ef-text
    split="word"
    class="text-white text-5xl font-bold"
    style="animation: 0.6s slide-up both; animation-delay: calc(var(--ef-word-index) * 100ms)"
  >Hello Editframe</ef-text>
</ef-timegroup>
<style>
  @keyframes slide-up {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

`split="word"` breaks the text into individual word elements. Each gets a `--ef-word-index` CSS variable so you can stagger delays. The animation runs relative to the scene timeline — it's fully scrubbable.

### Step 2: Add a Video Background

Place the title inside a `contain` timegroup with a video beneath it. The timegroup holds both layers simultaneously:

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[400px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="absolute inset-0 size-full object-cover"></ef-video>
  <div class="absolute inset-0 bg-black/50"></div>
  <ef-text
    split="word"
    class="absolute top-8 left-8 text-white text-4xl font-bold"
    style="animation: 0.6s slide-up both; animation-delay: calc(var(--ef-word-index) * 100ms)"
  >Hello Editframe</ef-text>
</ef-timegroup>
<style>
  @keyframes slide-up {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

### Step 3: Chain Scenes with a Transition

Use `mode="sequence"` with `overlap` to crossfade between scenes. Each scene fades out while the next fades in:

```html live
<ef-timegroup mode="sequence" overlap="1s" class="w-[720px] h-[400px] bg-black">
  <ef-timegroup mode="contain" class="absolute w-full h-full" style="animation: 1s fade-out var(--ef-transition-out-start) both">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="0s" sourceout="4s" class="absolute inset-0 size-full object-cover"></ef-video>
    <ef-text
      split="word"
      class="absolute top-8 left-8 text-white text-4xl font-bold"
      style="animation: 0.6s slide-up both; animation-delay: calc(var(--ef-word-index) * 100ms)"
    >Scene One</ef-text>
  </ef-timegroup>
  <ef-timegroup mode="contain" class="absolute w-full h-full" style="animation: 1s fade-in both">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="5s" sourceout="9s" class="absolute inset-0 size-full object-cover"></ef-video>
    <ef-text
      split="word"
      class="absolute top-8 left-8 text-white text-4xl font-bold"
      style="animation: 0.6s slide-up 0.3s both; animation-delay: calc(0.3s + var(--ef-word-index) * 100ms)"
    >Scene Two</ef-text>
  </ef-timegroup>
</ef-timegroup>
<style>
  @keyframes slide-up {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
</style>
```

`--ef-transition-out-start` is a CSS variable Editframe sets automatically — it's the point in time when the overlap begins, so the fade-out starts exactly at the transition point.

## Motion-First Composition

The first thing a viewer sees should move. This example animates a title word-by-word using `split="word"` and `--ef-word-index`:

```tsx
import { Timegroup, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="3s" className="w-[1920px] h-[1080px] bg-black flex items-center justify-center">
      <Text
        split="word"
        className="text-white text-7xl font-bold"
        style={{
          animation: "0.6s slide-up both",
          animationDelay: "calc(var(--ef-word-index) * 100ms)"
        }}
      >
        Hello Editframe
      </Text>
    </Timegroup>
  );
};
```

```css
@keyframes slide-up {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
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

**Important**: `TimelineRoot` is required for rendering. See [timeline-root.md](references/timeline-root.md).

## Add a Video Background

```tsx
import { Timegroup, Video, Text } from "@editframe/react";

export const MyVideo = () => (
  <Timegroup mode="contain" className="w-[1920px] h-[1080px] bg-black">
    <Video src="/assets/background.mp4" className="absolute inset-0 size-full object-cover" />
    <div className="absolute inset-0 bg-black/50" />
    <Text
      split="word"
      className="absolute top-16 left-16 text-white text-6xl font-bold"
      style={{
        animation: "0.6s slide-up both",
        animationDelay: "calc(var(--ef-word-index) * 100ms)"
      }}
    >
      Opening Title
    </Text>
  </Timegroup>
);
```

## Chain Scenes with a Transition

```tsx
import { Timegroup, Video, Text, Audio } from "@editframe/react";

export const VideoComposition = () => (
  <Timegroup mode="sequence" overlap="1s" className="w-[1920px] h-[1080px]">
    <Timegroup
      mode="contain"
      className="absolute w-full h-full"
      style={{ animation: "1s fade-out var(--ef-transition-out-start) both" }}
    >
      <Video src="/assets/intro.mp4" className="size-full object-cover" />
      <Text
        split="word"
        className="absolute top-16 left-16 text-white text-5xl font-bold"
        style={{ animation: "0.6s slide-up both", animationDelay: "calc(var(--ef-word-index) * 100ms)" }}
      >
        Scene One
      </Text>
    </Timegroup>
    <Timegroup
      mode="contain"
      className="absolute w-full h-full"
      style={{ animation: "1s fade-in both" }}
    >
      <Video src="/assets/main.mp4" className="size-full object-cover" />
      <Audio src="/assets/music.mp3" volume={0.3} />
    </Timegroup>
  </Timegroup>
);
```

```css
@keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
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
