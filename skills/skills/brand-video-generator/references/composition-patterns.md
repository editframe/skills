---
title: Composition Patterns
description: Video composition patterns where motion is structural — not decorative. Each pattern includes the animation that makes it work.
type: reference
order: 3
---

# Composition Patterns

Each pattern below includes the motion that earns it. A pattern without motion is a layout, not a video pattern.

---

## Word-by-Word Title Reveal

Text that builds itself word by word focuses attention on the message as it forms. Each word arriving at a slightly different moment creates rhythm that a static title cannot.

```html live
<ef-timegroup mode="fixed" duration="4s" class="w-[720px] h-[400px] bg-black flex items-center justify-center">
  <ef-text
    split="word"
    class="text-white text-5xl font-bold text-center max-w-2xl"
    style="animation: 0.5s word-in both; animation-delay: calc(var(--ef-word-index) * 120ms)"
  >The fastest way to ship video</ef-text>
</ef-timegroup>
<style>
  @keyframes word-in {
    from { transform: translateY(20px) scale(0.92); opacity: 0; }
    to   { transform: translateY(0)    scale(1);    opacity: 1; }
  }
</style>
```

**What motion adds:** Rhythm. The sequence of arrival directs reading order and emphasis. You can accelerate or decelerate the stagger to change the emotional register — tight spacing feels urgent, wide spacing feels deliberate.

---

## Scene with Animated Entry

Every element that appears should have a reason for how it arrives. A video background with text that enters from below reads as natural and alive. The same elements placed statically read as a screenshot.

```html live
<ef-timegroup mode="contain" class="w-[720px] h-[400px] bg-black">
  <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" class="absolute inset-0 size-full object-cover"></ef-video>
  <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
  <ef-text class="absolute bottom-8 left-8 text-white text-4xl font-bold"
    style="animation: 0.7s enter-up both 0.3s">Your headline here</ef-text>
  <ef-text class="absolute bottom-8 right-8 text-white/70 text-lg"
    style="animation: 0.5s enter-up both 0.6s">supporting context</ef-text>
</ef-timegroup>
<style>
  @keyframes enter-up {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

**What motion adds:** The staggered entrances sequence the viewer's attention — headline first, then context. The delay prevents information overload at frame one.

---

## Crossfade Sequence

Scenes that share a visual or tonal relationship crossfade naturally. The overlap period — when both scenes are simultaneously visible — is where the transition does its narrative work.

```html live
<ef-timegroup mode="sequence" overlap="1s" class="w-[720px] h-[400px] bg-black">
  <ef-timegroup mode="contain" class="absolute w-full h-full"
    style="animation: 1s fade-out var(--ef-transition-out-start) both">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="0s" sourceout="3s" class="absolute inset-0 size-full object-cover"></ef-video>
    <ef-text class="absolute bottom-8 left-8 text-white text-3xl font-bold"
      style="animation: 0.6s enter-up both">Before</ef-text>
  </ef-timegroup>
  <ef-timegroup mode="contain" class="absolute w-full h-full"
    style="animation: 1s fade-in both">
    <ef-video src="https://assets.editframe.com/bars-n-tone.mp4" sourcein="5s" sourceout="8s" class="absolute inset-0 size-full object-cover"></ef-video>
    <ef-text class="absolute bottom-8 left-8 text-white text-3xl font-bold"
      style="animation: 0.6s enter-up 0.4s both">After</ef-text>
  </ef-timegroup>
</ef-timegroup>
<style>
  @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes enter-up {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

**What motion adds:** The overlap creates a moment of co-presence where both states are simultaneously true. Use this for before/after, problem/solution, or any narrative transition where the relationship between scenes matters.

---

## Ken Burns (Kinetic Image)

Still photography becomes temporal through slow motion. A 0.8% scale change per second, over 8 seconds, creates a sense of time passing and attention drifting into the image.

```html live
<ef-timegroup mode="fixed" duration="8s" class="w-[720px] h-[400px] bg-black overflow-hidden">
  <ef-image
    src="https://assets.editframe.com/bars-n-tone.mp4"
    class="absolute inset-0 size-full object-cover"
    style="animation: 8s ken-burns both; transform-origin: center bottom"
  ></ef-image>
  <ef-text
    split="word"
    class="absolute bottom-8 left-8 text-white text-4xl font-bold"
    style="animation: 0.8s enter-up both 1s; animation-delay: calc(1s + var(--ef-word-index) * 120ms)"
  >The place they built it</ef-text>
</ef-timegroup>
<style>
  @keyframes ken-burns {
    from { transform: scale(1)    translate(0, 0); }
    to   { transform: scale(1.12) translate(-1%, -1%); }
  }
  @keyframes enter-up {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

**What motion adds:** Documentary weight. The imperceptible drift prevents the eye from settling, creating a sense of contemplation. The text arrives late — after the viewer has settled into the image.

---

## Procedural Canvas (frameTask)

For concepts that can't be shown with video — data, systems, processes, abstractions — `addFrameTask` gives access to the canvas for per-frame generative graphics. The animation is a pure function of time, so it's fully scrubbable and renderable.

**The motion must demonstrate something true about this product that is false about competitors.** Ask: what unit does this product operate on? Show that unit moving. These examples illustrate the thinking pattern — apply the same logic to the brand you're working with:

**Visual specificity requirement — including problem scenes:** The canvas animation must depict elements that are visually identifiable as belonging to this specific brand, even when showing problems or pain points. Generic 'chaos' or 'frustration' imagery (tangled curves, scattered nodes, visual noise) fails the specificity test just as badly as generic solution imagery. If you cannot identify a brand-specific visual element to animate, use the brand's actual logo as the animated element.

For problem/pain scenes specifically:
- Do NOT use abstract representations of chaos (bezier tangles, particle explosions, visual noise)
- DO reference the specific predecessor products or workflows this brand replaced
- Example (Figma): Show 'Final_v3_FINAL_real.sketch' filename hell, the specific email-attachment-feedback loop, or the 'someone overwrote my artboard' moment that Figma users recognize
- Example (Linear): Show Jira's specific notification overwhelm, the Asana nested-project maze, or the Slack-ping-about-the-Jira-ticket pattern
- The test: would a user of the OLD workflow immediately recognize this as their specific pain? If the pain could apply to any tool in the category, it's not specific enough.

**Anti-pattern:** Drawing category-generic imagery (mountains for outdoor, circuits for tech, leaves for sustainability, tangled lines for 'complexity') instead of brand-specific imagery. The test: could this exact canvas animation appear in a competitor's video without modification? If yes, it fails.

- Stripe (unified object model): the same `charge` object threads through Checkout, Radar, Connect, and Billing → show one object that every system touches simultaneously rather than a pipeline. Speed is generic; the shared object is Stripe's.

  **Problem-state specificity for Stripe**: Do NOT show generic fintech pain points (payment processing, payouts, fraud detection, reporting). These describe every competitor. Instead show the specific pre-Stripe architecture: multiple vendor SDKs with incompatible object models (a Braintree transaction ≠ a Plaid account ≠ a Sift fraud score), the middleware translation layer developers had to build, or the actual code comparison (50 lines of vendor-specific glue code vs. 3 lines of Stripe). The pain must be the pain Stripe specifically eliminated, not the category's general friction.
- Linear (opinionated workflow): issues that enter triage exit resolved — no ambiguous state, no "in review forever" → a tangled graph that snaps to a clean DAG when Linear acts on it; the removal of ambiguity *is* the product
- Figma (URL-as-file, multiplayer cursors): There are no files — just URLs. The canvas shows multiple named cursors (with real names like 'Sarah', 'Marcus') moving simultaneously on the same frame. The visual metaphor is the cursor cluster, not abstract collaboration dots. Show the actual Figma component structure: frames nested in frames, the layers panel hierarchy, the distinctive component instance diamond icon. Generic rectangles could be any design tool; the nested frame structure with component instances is Figma's.
- Supabase (Postgres as the core): The differentiator is not 'unified platform' (every BaaS claims this) but that you retain full Postgres access — Row Level Security policies written in SQL, realtime via Postgres replication (not a proprietary protocol), queryable with any Postgres client (psql, Prisma, any ORM). Show: a single RLS policy that replaces 200 lines of middleware, or the same table queried from browser JS, a mobile app, and psql simultaneously. The visual must be impossible to attribute to Firebase or PlanetScale.

The pattern: identify the brand's core mechanic (not its marketing position), then find the simplest motion that demonstrates that mechanic in action. The motion should be impossible to misattribute to a different brand.

If you could swap the brand name and the canvas animation would still make sense, the animation is decoration.

**When showing chaos or pain, make it viscerally uncomfortable — not aesthetically pleasing.** A beautiful tangle of purple bezier curves communicates "elegant complexity." To communicate "I live in this every day and it's exhausting," the visual needs to be overwhelming: too many elements, too fast, overlapping in a way that makes the eye unable to rest. Chaos animations that look designed signal that the problem is aesthetic, not real.

```html
<ef-timegroup mode="fixed" duration="6s" id="canvas-scene" class="w-[720px] h-[400px] bg-slate-900">
  <canvas id="particles" class="absolute inset-0 size-full"></canvas>
  <ef-text class="absolute bottom-8 left-8 text-white text-3xl font-bold"
    style="animation: 0.6s enter-up 1s both">Energy in motion</ef-text>
</ef-timegroup>

<script>
  const tg = document.getElementById('canvas-scene');
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');

  tg.addFrameTask((ownCurrentTimeMs, durationMs) => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const progress = ownCurrentTimeMs / durationMs;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 80 particles whose speed and radius scale with progress
    for (let i = 0; i < 80; i++) {
      const seed = i * 137.5;
      const x = (Math.sin(seed + ownCurrentTimeMs * 0.0008) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(seed * 0.7 + ownCurrentTimeMs * 0.0006) * 0.5 + 0.5) * canvas.height;
      const r = 2 + Math.sin(seed + progress * Math.PI) * 2;
      const alpha = 0.3 + progress * 0.5;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 179, 237, ${alpha})`;
      ctx.fill();
    }
  });
</script>
<style>
  @keyframes enter-up {
    from { transform: translateY(16px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

**What motion adds:** The particle system is the argument. The concept being communicated — energy, activity, distributed processing, whatever — is visible in the form of the animation, not just stated in text over a stock video.

**A `<canvas>` element with no `<script>` is a broken composition.** If you include a canvas, you must include the `addFrameTask` implementation. If you are not going to write the script, use a CSS animation instead.

---

## Progress-Driven Animation

`--ef-progress` is a CSS variable that holds the current playback progress (0–1) for any timegroup. It updates every frame. This makes it possible to drive any CSS property as a pure function of time — without keyframes.

```html live
<ef-timegroup mode="fixed" duration="5s" class="w-[720px] h-[200px] bg-slate-900 flex flex-col items-center justify-center gap-4 p-8">
  <div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
    <div class="h-full bg-blue-400 rounded-full transition-none"
      style="width: calc(var(--ef-progress) * 100%)"></div>
  </div>
  <ef-text class="text-white text-2xl">Processing your request</ef-text>
</ef-timegroup>
```

**What motion adds:** The progress bar is not decorating a static message — it is the message. The viewer watches time pass as a spatial event. Any numeric or proportional concept can be represented this way.

---

## Persistent Background with Entering Foreground

A continuous background (music, ambient video, or canvas) while foreground content animates in and out creates the feeling of a coherent world being revealed in stages, rather than a series of disconnected slides.

```html
<ef-timegroup mode="fixed" duration="15s" class="absolute w-full h-full">
  <ef-video src="background.mp4" class="absolute inset-0 size-full object-cover opacity-60"></ef-video>
  <ef-audio src="music.mp3" volume="0.2"></ef-audio>

  <ef-timegroup mode="sequence" class="absolute inset-0">
    <ef-timegroup mode="fixed" duration="4s" class="absolute inset-0 flex items-center justify-center"
      style="animation: 0.5s fade-in both, 0.5s fade-out var(--ef-transition-out-start) both">
      <ef-text split="word" class="text-white text-5xl font-bold text-center"
        style="animation: 0.5s enter-up both; animation-delay: calc(var(--ef-word-index) * 80ms)">
        One thing at a time
      </ef-text>
    </ef-timegroup>
    <ef-timegroup mode="fixed" duration="4s" class="absolute inset-0 flex items-center justify-center"
      style="animation: 0.5s fade-in both, 0.5s fade-out var(--ef-transition-out-start) both">
      <ef-text split="word" class="text-white text-5xl font-bold text-center"
        style="animation: 0.5s enter-up both; animation-delay: calc(var(--ef-word-index) * 80ms)">
        Each idea earns its place
      </ef-text>
    </ef-timegroup>
  </ef-timegroup>
</ef-timegroup>
<style>
  @keyframes fade-in  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
  @keyframes enter-up {
    from { transform: translateY(20px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
</style>
```

**What motion adds:** The continuous background creates continuity. The foreground entrances and exits create rhythm. Together they produce a sense of a video that lives in one world, not a sequence of separate moments.

---

## Further Reading

- [css-variables.md](../composition/references/css-variables.md) — `--ef-progress`, `--ef-duration`, `--ef-transition-*`
- [scripting.md](../composition/references/scripting.md) — `addFrameTask` and canvas access
- [text.md](../composition/references/text.md) — `split`, `--ef-word-index`, `--ef-stagger-offset`, `--ef-seed`
- [transitions.md](../composition/references/transitions.md) — slide, zoom, dissolve between scenes
- [editing.md](editing.md) — what to cut and when to stop
