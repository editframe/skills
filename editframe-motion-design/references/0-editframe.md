---
description: "How the motion design principles map to Editframe syntax — CSS animations, --ef-progress, text splitting, addFrameTask, and transitions."
metadata:
  author: editframe
  version: 0.46.0
---


# Implementing Motion in Editframe

The motion design principles in this skill apply directly to Editframe's composition system. This reference maps each concept to the specific Editframe tools that implement it.

---

## Easing and Physics → CSS `animation-timing-function`

The material physics model translates directly to CSS easing curves. Apply them to the `animation` shorthand on any element.

```html
<!-- Glass: clean entrance, minimal overshoot -->
<ef-text style="animation: 400ms title-enter both; animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1)">
  Professional Title
</ef-text>

<!-- Rubber: bouncy entrance for playful brands -->
<ef-text style="animation: 600ms logo-bounce both; animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55)">
  Fun Brand
</ef-text>

@keyframes title-enter {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes logo-bounce {
  from { transform: scale(0.8); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
```

Add a new section after the material reference table:

---

## Rhythm Through Variation

**Anti-pattern:** All animations using identical duration and easing creates mechanical, monotonous motion.

**Rule:** Within any scene, vary at least ONE of: duration, easing, or delay pattern.

**For keyboard/command-driven products (Linear, Raycast, etc.):**
- Primary actions: 200-300ms, sharp easing (`cubic-bezier(0.55, 0, 1, 0.45)`) — feels responsive
- State transitions: 400-500ms, smooth easing — shows the system working
- Reveals/entrances: 500-600ms, gentle easing — gives content room to land

```html
<!-- Wrong: monotonous -->
<ef-text style="animation: 0.6s enter ease-out">Action</ef-text>
<ef-text style="animation: 0.6s enter ease-out">Result</ef-text>

<!-- Right: rhythm through variation -->
<ef-text style="animation: 0.25s snap cubic-bezier(0.55, 0, 1, 0.45)">⌘K</ef-text>
<ef-text style="animation: 0.5s reveal ease-out 0.15s">Issue created</ef-text>
```

---

## Stagger → `ef-text` `split` and `--ef-word-index`

The attention sequencing principle — one focus at a time — is implemented through text splitting and CSS variable stagger delays.

```html
<!-- Word-by-word reveal with stagger -->
<ef-text
  split="word"
  class="text-white text-4xl"
  style="animation: 0.5s word-in both; animation-delay: calc(var(--ef-word-index) * 80ms)"
>Your message builds word by word</ef-text>

<!-- Character-by-character (typewriter style) -->
<ef-text
  split="char"
  class="text-white text-3xl font-mono"
  style="animation: 0.1s char-in both; animation-delay: calc(var(--ef-char-index) * 40ms)"
>LOADING...</ef-text>

<!-- Line-by-line with organic variation using --ef-seed -->
<ef-text
  split="line"
  class="text-white text-2xl"
  style="animation: 0.6s line-in both; animation-delay: calc(var(--ef-line-index) * 150ms); animation-timing-function: cubic-bezier(0, 0.55, calc(0.45 + var(--ef-seed) * 0.1), 1)"
>First line
Second line
Third line</ef-text>

@keyframes word-in  { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes char-in  { from { opacity: 0; }                               to { opacity: 1; }              }
@keyframes line-in  { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
```

**Available CSS variables on split elements:**

- `--ef-word-index` — 0-based index of this word in its parent
- `--ef-char-index` — 0-based index of this character
- `--ef-line-index` — 0-based index of this line
- `--ef-stagger-offset` — total number of siblings (for inverse stagger: `calc((var(--ef-stagger-offset) - var(--ef-word-index)) * 80ms)`)
- `--ef-seed` — stable random value per element, useful for organic variation

---

## Progress-Driven Animation → `--ef-progress`

`--ef-progress` updates every frame to the current playback position (0–1) of its timegroup. This drives any CSS property as a continuous function of time.

```html
<!-- Bar that fills with time -->
<ef-timegroup mode="fixed" duration="10s" class="w-full h-2 bg-slate-700">
  <div class="h-full bg-blue-400" style="width: calc(var(--ef-progress) * 100%)"></div>
</ef-timegroup>

<!-- Color that shifts from cool to warm -->
<ef-timegroup mode="fixed" duration="8s" class="w-full h-full"
  style="background: hsl(calc(220 - var(--ef-progress) * 150), 70%, 50%)">
</ef-timegroup>

<!-- Counter that counts up -->
<ef-timegroup mode="fixed" duration="5s" id="counter-scene">
  <div id="count" class="text-white text-6xl font-bold">0</div>
</ef-timegroup>
<script>
  const scene = document.getElementById('counter-scene');
  const count = document.getElementById('count');
  scene.addFrameTask((ownCurrentTimeMs, durationMs) => {
    const progress = ownCurrentTimeMs / durationMs;
    count.textContent = Math.floor(progress * 1000000).toLocaleString();
  });
</script>
```

**Other available time variables:**

- `--ef-duration` — element's total duration as a CSS time value (e.g., `"8s"`)
- `--ef-transition-duration` — overlap duration for scene transitions
- `--ef-transition-out-start` — when fade-out should start (use as `animation-delay` for exits)

---

## Per-Frame Procedural Animation → `addFrameTask`

For animations that can't be expressed with CSS — particle systems, generative graphics, data visualization, physics simulations — `addFrameTask` runs a callback every frame with the current time.

```html
<ef-timegroup mode="fixed" duration="6s" id="scene" class="w-full h-full bg-slate-900">
  <canvas id="canvas" class="absolute inset-0 size-full"></canvas>
</ef-timegroup>

<script>
  const scene = document.getElementById('scene');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  scene.addFrameTask((ownCurrentTimeMs, durationMs) => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const progress = ownCurrentTimeMs / durationMs;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Example: lines connecting to a center point, growing with progress
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = Math.floor(progress * 60);

    for (let i = 0; i < count; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const radius = 200 + Math.sin(i * 0.5 + ownCurrentTimeMs * 0.001) * 40;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = `rgba(99, 179, 237, ${0.2 + progress * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
</script>
```

**Key rules for `addFrameTask`:**

- The callback receives `(ownCurrentTimeMs, durationMs)` — local time, not global
- Always resize the canvas inside the callback (`canvas.width = canvas.offsetWidth`) — this clears it
- The callback runs on every frame during rendering, so it must be a pure function of `ownCurrentTimeMs`
- No `Date.now()`, `Math.random()`, or any non-deterministic values — renders must be reproducible

---

## Overlapping Attention Choreography → `overlap` and CSS Delays

Sequence elements with partially overlapping animations to create natural rhythm. The `overlap` attribute on `ef-timegroup` creates shared time between adjacent scenes; staggered `animation-delay` sequences elements within a scene.

```html
<!-- Within-scene sequencing: logo → headline → subhead -->
<ef-timegroup mode="contain" duration="4s" class="absolute w-full h-full">
  <!-- Logo arrives first -->
  <ef-image src="logo.png" class="absolute top-8 left-8 w-32"
    style="animation: 0.5s enter-down both 0s"></ef-image>

  <!-- Headline starts before logo finishes (overlap 60%) -->
  <ef-text class="absolute top-1/3 left-8 text-white text-5xl font-bold"
    style="animation: 0.6s enter-up both 0.3s"></ef-text>

  <!-- Subhead follows headline -->
  <ef-text class="absolute top-1/2 left-8 text-white/70 text-2xl"
    style="animation: 0.5s enter-up both 0.7s">Supporting text</ef-text>
</ef-timegroup>

@keyframes enter-down { from { transform: translateY(-16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes enter-up   { from { transform: translateY(16px);  opacity: 0; } to { transform: translateY(0); opacity: 1; } }
```

**Between-scene sequencing using `overlap`:**

```html
<!-- 1s overlap between scenes creates shared time for crossfade -->
<ef-timegroup mode="sequence" overlap="1s">
  <ef-timegroup mode="contain" class="absolute w-full h-full"
    style="animation: 1s fade-out var(--ef-transition-out-start) both">
    <!-- Scene A content -->
  </ef-timegroup>
  <ef-timegroup mode="contain" class="absolute w-full h-full"
    style="animation: 1s fade-in both">
    <!-- Scene B content -->
  </ef-timegroup>
</ef-timegroup>
```

---

## Exit Animations → `--ef-transition-out-start`

Exits should be shorter than entrances (30–40% shorter). Use `--ef-transition-out-start` to trigger exit animations at precisely the right moment, regardless of scene duration.

```html
<ef-timegroup mode="contain" duration="6s" class="absolute w-full h-full"
  style="animation: 1s fade-out var(--ef-transition-out-start) both">

  <!-- Elements exit before the scene ends (staggered out) -->
  <ef-text class="absolute bottom-8 text-white text-4xl"
    style="animation: 0.4s exit-down var(--ef-transition-out-start) both">Headline</ef-text>
  <ef-text class="absolute bottom-4 text-white/70 text-xl"
    style="animation: 0.4s exit-down calc(var(--ef-transition-out-start) - 0.1s) both">Subhead</ef-text>
</ef-timegroup>

@keyframes exit-down  { from { transform: translateY(0); opacity: 1; } to { transform: translateY(16px); opacity: 0; } }
@keyframes fade-out   { from { opacity: 1; } to { opacity: 0; } }
```

`--ef-transition-out-start` is set automatically when `overlap` is used on the parent sequence. For scenes without a sequence parent, it equals `--ef-duration - <overlap>`.

---

## React Implementation

In React, apply animations as inline `style` props:

```tsx
import { Timegroup, Text } from "@editframe/react";

// Word stagger
<Text
  split="word"
  className="text-white text-4xl font-bold"
  style={{
    animation: "0.5s word-in both",
    animationDelay: "calc(var(--ef-word-index) * 80ms)"
  }}
>
  Your message here
</Text>

// Progress-driven via addFrameTask on ref
import { useRef, useEffect } from "react";

const ProgressBar = () => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bar = el.querySelector('.bar') as HTMLElement;
    el.addFrameTask((t, d) => {
      bar.style.width = `${(t / d) * 100}%`;
    });
  }, []);
  return (
    <Timegroup ref={ref} mode="fixed" duration="5s" className="w-full h-2 bg-slate-700">
      <div className="bar h-full bg-blue-400 transition-none" />
    </Timegroup>
  );
};
```
