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

**CRITICAL: Canvas Completeness Requirements**

A `<canvas>` element without a complete `addFrameTask` script is a broken composition that renders nothing.

**Before including ANY canvas element:**
1. Write the COMPLETE script first, including the full `addFrameTask` callback with all closing braces
2. Verify the script is not truncated — check that it ends with `});` and `</script>`
3. If approaching output length limits, STOP and either: (a) simplify the canvas animation, (b) replace with CSS animation, or (c) merge the scene's content into an adjacent scene
4. Never leave a canvas scene with placeholder or incomplete code — delete the scene entirely rather than ship broken motion

**Output limit rule:** If a composition has 4+ canvas scenes, verify each script is complete before adding another. A video with 3 working canvas scenes is better than 4 scenes where one is broken.

For concepts that can't be shown with video — data, systems, processes, abstractions — `addFrameTask` gives access to the canvas for per-frame generative graphics. The animation is a pure function of time, so it's fully scrubbable and renderable.

**The motion must demonstrate something true about this product that is false about competitors.** Ask: what unit does this product operate on? Show that unit moving. These examples illustrate the thinking pattern — apply the same logic to the brand you're working with:

**Visual specificity requirement — including problem scenes:** The canvas animation must depict elements that are visually identifiable as belonging to this specific brand, even when showing problems or pain points. Generic 'chaos' or 'frustration' imagery (tangled curves, scattered nodes, visual noise) fails the specificity test just as badly as generic solution imagery. If you cannot identify a brand-specific visual element to animate, use the brand's actual logo as the animated element.

For problem/pain scenes specifically:
- Do NOT use abstract representations of chaos (bezier tangles, particle explosions, visual noise)
- DO reference the specific predecessor products or workflows this brand replaced
- Example (browser-native design tool): Show filename-versioning hell ('Final_v3_FINAL_real.psd'), the email-attachment-feedback loop, or the 'someone overwrote my artboard' moment that users recognize
- Example (opinionated issue tracker): Show the legacy project tool's 47-field issue creation form, the 'which board is this on?' confusion across 12 open tabs, notification spam from issue references, or the exact moment a sprint ceremony produces no actionable output
- The test: would a user of the OLD workflow immediately recognize this as their specific pain? If the pain could apply to any tool in the category, it's not specific enough.

**For environmental/waste problem scenes:**
- Do NOT show abstract shapes or particles representing waste
- DO show recognizable objects being discarded: garment silhouettes with visible textures (fleece, denim, puffer quilting), product shapes the audience owns
- The visual must create discomfort, not aesthetic abstraction. A beautiful gradient with text saying 'gear ends up here' creates no emotional weight. Show the actual pile, the actual landfill texture, the actual garment being thrown away.
- Example (repair-first outdoor apparel brand): Show the brand's recognizable garment silhouette (the distinctive shoulder yoke, the chest pocket placement) crumpled or falling into a heap. The viewer should think 'that's my jacket.'
- The test: does the viewer feel a pang of recognition/guilt, or do they observe an information graphic? If the latter, the scene fails.

**CRITICAL: Visual specificity is non-negotiable.**

1. **Logo requirement**: Never use placeholder shapes (rectangles, circles, generic icons) for logos. If you cannot access the actual logo, describe it textually and leave a `<!-- TODO: Replace with actual logo SVG -->` comment. Three horizontal lines, generic app icons, or geometric approximations are prohibited.

2. **UI requirement**: For software products, canvas animations must depict recognizable UI patterns from the actual product. Research the product's distinctive interface elements: command palettes, card designs, navigation patterns, specific iconography. Generic 'keyboard keys and circles' could represent any software product.

**The substitute test**: Replace the brand name. Could this exact visual appear in a competitor's video unchanged? If yes, the visual fails and must be redesigned with brand-specific elements.

- Payments API (unified object model): the same core object threads through every product in the suite → show one object that every system touches simultaneously rather than a pipeline. Speed is generic; the shared object is the differentiator. **Scale metrics must be earned by first showing the mechanism. Show the object flowing through checkout → risk → connect → billing in one continuous motion, THEN reveal the scale that architecture enabled. A metric stated before the architecture is demonstrated is an unsupported claim.**

  **Problem-state specificity for payments APIs**: Do NOT show generic fintech pain points (payment processing, payouts, fraud detection, reporting). These describe every competitor. Instead show the specific pre-API architecture: multiple vendor SDKs with incompatible object models (a transaction object in one SDK ≠ an account object in another ≠ a score object in a third), the middleware translation layer developers had to build, or the actual code comparison (50 lines of vendor-specific glue code vs. 3 lines). The pain must be the pain this API specifically eliminated, not the category's general friction.

  **Solution-state visual requirements for payments APIs**: The solution scene MUST include at least one of: (1) actual code showing the API's syntax elegance (the brand's actual SDK method calls and object names vs. competitor verbosity), (2) the distinctive Dashboard UI aesthetic (the specific card layouts, the typography, the data visualization style), (3) recognizable customer logos that this specific API powers, or (4) the branded visual identity beyond just colors (the brand's particular visual treatments, illustration style, or documentation aesthetic). Generic API response JSON or abstract 'unified platform' diagrams fail the substitute test — any payments company could use them.
- Opinionated issue tracker: issues that enter triage exit resolved — no ambiguous state, no "in review forever" → a tangled graph that snaps to a clean DAG; the removal of ambiguity *is* the product
- Browser-native design tool (URL-as-file, multiplayer cursors): There are no files — just URLs. The canvas shows multiple named cursors (with real names like 'Sarah', 'Marcus') moving simultaneously on the same frame. The visual metaphor is the cursor cluster, not abstract collaboration dots. Show the actual component structure: frames nested in frames, the layers panel hierarchy, the distinctive component instance icon. Generic rectangles could be any design tool; the nested frame structure with component instances is this tool's.
- Backend-as-a-service built on an existing database: The differentiator is not 'unified platform' (every BaaS claims this) but that you retain full database access — row-level security policies written in standard SQL, realtime via database replication (not a proprietary protocol), queryable with any standard client. Show: a single RLS policy that replaces 200 lines of middleware, or the same table queried from browser JS, a mobile app, and a CLI simultaneously. The visual must be impossible to attribute to any competing BaaS product.

The pattern: identify the brand's core mechanic (not its marketing position), then find the simplest motion that demonstrates that mechanic in action. The motion should be impossible to misattribute to a different brand.

If you could swap the brand name and the canvas animation would still make sense, the animation is decoration.

**When showing chaos or pain, make it viscerally uncomfortable — not aesthetically pleasing.** A beautiful tangle of purple bezier curves communicates "elegant complexity." To communicate "I live in this every day and it's exhausting," the visual needs to be overwhelming: too many elements, too fast, overlapping in a way that makes the eye unable to rest. Chaos animations that look designed signal that the problem is aesthetic, not real.

**CRITICAL: Canvas animations MUST use addFrameTask, never requestAnimationFrame.** The `requestAnimationFrame` API runs on wall-clock time and will not sync with the composition timeline during rendering. All procedural animation must be driven by `ownCurrentTimeMs` from the addFrameTask callback.

**Canvas animations must evolve to match narrative phases.** A canvas that looks the same at second 1 and second 25 is not supporting the story — it's decoration. Before writing any canvas `addFrameTask`, map the narrative phases to distinct visual states:

```
Narrative phase    | Time range | Canvas visual state
-------------------|------------|--------------------
Problem/isolation  | 0-8s       | Single element, muted, sparse
Transition         | 8-12s      | Elements begin appearing
Resolution/energy  | 12-25s     | Full activity, vibrant
CTA                | 25-30s     | Resolve to final state
```

The `addFrameTask` callback receives `ownCurrentTimeMs` — use it to branch visual behavior:

```javascript
tg.addFrameTask((info) => {
  const { ownCurrentTimeMs, durationMs } = info;
  const progress = ownCurrentTimeMs / durationMs;

  // Phase 1: Isolation (0-27%)
  if (progress < 0.27) {
    // Draw single cursor, muted colors
  }
  // Phase 2: First companion appears (27-40%)
  else if (progress < 0.40) {
    // Add second cursor
  }
  // Phase 3: Full collaboration (40-83%)
  else if (progress < 0.83) {
    // All cursors active, vibrant
  }
  // Phase 4: Resolve (83-100%)
  else {
    // Settle into final composition
  }
});
```

**Anti-pattern:** A canvas animation where all elements are present from frame 1, contradicting a narrative that claims transformation. If the text says 'you start alone,' the canvas must show alone first.

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

  tg.addFrameTask((info) => {
    const { ownCurrentTimeMs, durationMs } = info;
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

## Visual Language Consistency

Once you establish a visual technique (canvas animations, a particular motion style, a color treatment), maintain it through the final scene. Reverting to simpler techniques at the end breaks the viewer's engagement at the moment it should peak.

**Anti-pattern:** Three scenes of sophisticated canvas animation followed by a final scene with static text and basic CSS fades. The CTA scene should be a culmination, not a retreat.

**Better:** If scenes 1-3 use orbital particle systems, Scene 4 should show those particles converging into the logo or final message. The motion vocabulary established early must resolve, not disappear.

```html
<!-- Wrong: Canvas scenes → static text CTA -->
<ef-timegroup mode="fixed" duration="7s">
  <ef-text class="text-6xl">Design together</ef-text>  <!-- Breaks visual momentum -->
</ef-timegroup>

<!-- Right: Canvas animation continues through CTA -->
<ef-timegroup mode="fixed" duration="7s" id="finale">
  <canvas id="finale-canvas" class="absolute inset-0"></canvas>
  <ef-text class="absolute bottom-8 text-4xl">Design together</ef-text>
</ef-timegroup>
<script>
  // Particles from previous scene converge into logo position
</script>
```

---

## Further Reading

- [css-variables.md](../composition/references/css-variables.md) — `--ef-progress`, `--ef-duration`, `--ef-transition-*`
- [scripting.md](../composition/references/scripting.md) — `addFrameTask` and canvas access
- [text.md](../composition/references/text.md) — `split`, `--ef-word-index`, `--ef-stagger-offset`, `--ef-seed`
- [transitions.md](../composition/references/transitions.md) — slide, zoom, dissolve between scenes
- [editing.md](editing.md) — what to cut and when to stop
