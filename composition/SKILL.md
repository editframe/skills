---
name: composition
description: "Build video compositions with Editframe. Use HTML web components or React. Add video, audio, images, text, captions, and transitions, then render to a file."
license: MIT
metadata:
  author: editframe
  version: "2.1"
---


# Video Composition

Build video scenes with HTML web components, for example `<ef-timegroup>` and `<ef-video>`. Or build them with React components, for example `<Timegroup>` and `<Video>`. Both syntaxes share the same composition model and the same rendering pipeline. Pick the syntax that fits your project.

Web component attributes use kebab-case, for example `file-id` and `api-host`. React props use camelCase, for example `fileId` and `apiHost`. Four attributes break this pattern: `sourcein`, `sourceout`, `trimstart`, and `trimend`. Each of these uses the same lowercase string as both the HTML attribute and the React prop. The Element Reference section lists both forms for every attribute.

## Quick Start

```html
<ef-timegroup mode="sequence" class="w-full h-full">
  <ef-timegroup mode="fixed" duration="2s" class="absolute w-full h-full">
    <ef-image src="logo.png" class="size-full object-contain"></ef-image>
    <ef-text class="absolute inset-x-0 bottom-12 text-center text-white text-3xl">My Brand</ef-text>
  </ef-timegroup>
  <ef-timegroup class="absolute w-full h-full">
    <ef-video src="main.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
</ef-timegroup>
```

```tsx
import { Timegroup, Video, Image, Text, TimelineRoot } from "@editframe/react";

const MyVideo = ({ id }: { id: string }) => (
  <Timegroup id={id} mode="sequence" className="w-full h-full">
    <Timegroup mode="fixed" duration="2s" className="absolute w-full h-full">
      <Image src="logo.png" className="size-full object-contain" />
      <Text className="absolute inset-x-0 bottom-12 text-center text-white text-3xl">My Brand</Text>
    </Timegroup>
    <Timegroup className="absolute w-full h-full">
      <Video src="main.mp4" className="size-full object-cover" />
    </Timegroup>
  </Timegroup>
);

export const App = () => <TimelineRoot id="my-video" component={MyVideo} />;
```

This example makes two duration decisions. The logo card uses `fixed duration="2s"`. A logo has no natural display length, so this duration is an editorial choice.

The second scene defaults to `contain` mode. Its only child is `main.mp4`, so the clip determines its duration. A longer audio sibling extends this scene. For a music bed, see the `fit` example under Timegroups & sequencing.

Every React composition that renders or exports needs a `TimelineRoot` wrapper. See React below for the reason.

This example loads media directly, without `<ef-configuration>`/`<Configuration>`. Add that wrapper for local JIT transcoding, API routing, or signing. See Advanced → Configuration below.

## Duration Units

`5s` (seconds) | `1000ms` (milliseconds) | `2m` (minutes)

Start a new project with `npm create @editframe`. See the `editframe-create` skill for details.

## Core Concepts

### Time model

Every element — `ef-timegroup`, `ef-video`, `ef-text`, and others — is a temporal element. Each temporal element carries two time properties, in seconds:

- `duration` — the length of the element.
- `ownCurrentTime` — the element's local playhead position. Editframe derives this value from the nearest ancestor's time, plus the element's own `offset`/window.

Media elements carry one more time property: `currentSourceTime`. This is the position within the underlying source file, after `sourcein`/trim.

Only the root element's `currentTime` accepts a direct write. Set it with `seek()` or `seekForRender()`. Editframe derives every other time value from the root. Each derived value flows one way, down the tree.

`*Ms` variants of these properties (`durationMs`, `ownCurrentTimeMs`, and others) still exist for backward compatibility. These variants are deprecated. Use the seconds fields in new code.

Editframe supports four trim attributes:

- `sourcein`/`sourceout` — select a window within the source file.
- `trimstart`/`trimend` — cut time from the start or the end of an element's own duration.

Use `offset` to position a child element within a `fixed`, `contain`, or `fit` parent.

### Timegroups & sequencing

`ef-timegroup` is the only container element. Its `mode` attribute controls two things: the timegroup's own duration, and the time window of each child. The table below lists each mode.

| Mode | Duration | Children |
|---|---|---|
| `fixed` | The `duration` attribute. | Each positioned at its own `offset`, in parallel. |
| `sequence` | Sum of children's durations, minus `overlap` between each adjacent pair. | Play back-to-back; only the active one(s) are visible (`hidden` toggles, `data-active` attribute). |
| `contain` (default) | Furthest extent of `offset + duration` across children. | Parallel, each at its own `offset`. |
| `fit` | Inherits the nearest ancestor timegroup's duration (falls back to `contain` if this is the root). | Parallel, each at its own `offset`. |

Use `sequence` mode to play a series of scenes back-to-back. See the Quick Start example above. Set `overlap` (a CSS time, for example `overlap="1s"`) to shift the next scene's start earlier by that amount. This lets the next scene play at the same time as the previous scene's tail, for a crossfade or transition window.

**To choose a mode, ask one question: does the media set this element's duration, or do you set it?**

- **Media-driven.** Use this for a video clip, a voiceover, or anything else whose length comes from its own content. Do not set a `duration`. Leave `mode` unset, so it defaults to `contain`, and the timegroup's length comes from its content. This choice turns a composition into a reusable template. You can build the timeline before you know the final media duration. Later, swap in a different-length clip, and the timing still works with no manual changes.
- **Editorial choice.** Use this for a title card, a fixed-length outro, or any beat you time yourself. There is no natural duration to derive here. Set `fixed duration="..."`.
- **Inherited.** `fit` mode always tracks the nearest ancestor timegroup's duration, not its own content's duration. Use `fit` when an element must span exactly as long as a relative whose length you do not know in advance. The most common case: a background audio bed under a `sequence` of scenes.

```html
<ef-timegroup class="w-full h-full"> <!-- contain (default): sized to the sequence below -->
  <ef-timegroup mode="sequence" class="absolute w-full h-full">
    <ef-timegroup mode="fixed" duration="3s" class="absolute w-full h-full">
      <ef-video src="a.mp4" class="size-full object-cover"></ef-video>
    </ef-timegroup>
    <ef-timegroup class="absolute w-full h-full">
      <ef-video src="b.mp4" class="size-full object-cover"></ef-video>
    </ef-timegroup>
  </ef-timegroup>
  <ef-timegroup mode="fit">
    <ef-audio src="bed.mp3" volume="0.3"></ef-audio>
  </ef-timegroup>
</ef-timegroup>
```

The audio bed plays for exactly as long as the sequence lasts. Today the sequence lasts 8 seconds. Tomorrow, after a clip change, it lasts 12 seconds. Either way, no duration needs manual synchronization.

Do not default every scene to `fixed`. This throws away the main benefit of a template. It forces a manual re-time every time a media source's length changes, instead of letting the composition adapt on its own.

### Transitions

Editframe has no special transition element. Build a transition from `overlap` plus CSS. Set `overlap` on a `sequence` timegroup. Editframe then sets two CSS custom properties on each overlapping child scene:

- `--ef-transition-duration` — the overlap time, in seconds.
- `--ef-transition-out-start` — the time, in seconds, when the scene's exit animation should start. This equals `duration - overlap`.

Drive your fade, slide, or zoom animation with WAAPI or CSS, keyed off these two properties.

```html
<ef-timegroup mode="sequence" overlap="0.5s">
  <ef-timegroup mode="fixed" duration="3s" class="scene">
    <ef-video src="a.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
  <ef-timegroup mode="fixed" duration="3s" class="scene">
    <ef-video src="b.mp4" class="size-full object-cover"></ef-video>
  </ef-timegroup>
</ef-timegroup>

<style>
  .scene {
    animation: fade-out linear;
    animation-duration: var(--ef-transition-duration, 0s);
    animation-delay: var(--ef-transition-out-start, 9999s);
    animation-fill-mode: forwards;
  }
  @keyframes fade-out {
    to { opacity: 0; }
  }
</style>
```

### CSS variables for time-based animation

Every temporal element continuously publishes two CSS custom properties on itself while it plays:

- `--ef-duration` — its own duration, as a CSS time (for example `5s`).
- `--ef-progress` — a number from 0 to 1, with no unit.

Use these properties to drive scrub-synced CSS with no JavaScript.

```css
ef-timegroup[mode="fixed"] .progress-bar {
  transform: scaleX(var(--ef-progress));
}
```

`ef-text` segments (see below) also get `--ef-index`, `--ef-word-index`, `--ef-stagger-offset`, and `--ef-seed`. `ef-captions` words get `--ef-word-index`, `--ef-word-seed`, and `--ef-word-start`.

### Scripting

Editframe gives you two hooks to run JavaScript synchronized to the composition clock. Use these hooks instead of `requestAnimationFrame`.

**Never drive per-frame state with `requestAnimationFrame`, `setInterval`, or a wall-clock timer.** Browsers throttle or fully suspend `requestAnimationFrame` callbacks in a backgrounded tab or window. Headless and offscreen export always run in this backgrounded state. Ordinary editing often runs in this state too, whenever the preview tab loses focus. A composition driven by `requestAnimationFrame` silently stops animating, or drifts out of sync with the render clock.

`addFrameTask` has neither problem. The seek/render pipeline invokes it directly for every rendered frame. It stays correct regardless of tab visibility.

- `timegroup.initializer = (timegroup) => { ... }` — a JavaScript-only property, not an HTML attribute. It runs exactly once per instance, and once per render clone (see Rendering below). Write it as a **synchronous** function. Do not await anything inside it. Use it to register `addFrameTask` callbacks and to set up state. You can call `resolveDuration()` or `addFrameTask` from inside it. A thrown error, or a run time past 10ms, logs a warning. A run time past 100ms logs an error.
- `timegroup.addFrameTask((info) => { ... })` — registers a per-frame callback. Editframe calls this callback on every seek, with `{ ownCurrentTime, currentTime, duration, percentComplete, element }` (all times in seconds). The method returns an unregister function.

```html
<ef-timegroup id="scene" mode="fixed" duration="5s">
  <ef-text id="counter" class="absolute inset-0 flex items-center justify-center text-6xl"></ef-text>
</ef-timegroup>
<script>
  const scene = document.getElementById("scene");
  scene.initializer = (timegroup) => {
    const counter = timegroup.querySelector("#counter");
    timegroup.addFrameTask(({ ownCurrentTime }) => {
      counter.textContent = Math.floor(ownCurrentTime * 10).toString();
    });
  };
</script>
```

In React, pass the same functions as the `initializer`/`onFrame` props on `<Timegroup>`. `onFrame` is shorthand for a single `addFrameTask` call.

## Media Elements

`ef-video`, `ef-audio`, and `ef-image` are simple temporal leaf elements. See the Element Reference below for the full attribute list: trimming, volume, variant ladders, FFT analysis, and more. A few elements have behavior worth extra explanation.

**`ef-text`** splits its text content into `ef-text-segment` children. Set `split="word"`, `split="char"`, or `split="line"` to choose the split unit. Set `stagger` (a CSS time) to delay each segment's start.

Each `ef-text-segment` renders in the light DOM, with no shadow root. It carries `--ef-index`, `--ef-word-index`, `--ef-stagger-offset`, and `--ef-seed` custom properties.

Attach entrance animations to the segment itself. Each segment remains visible after its start. Its `data-active` attribute ends when the next staggered segment starts. Use that attribute for temporary emphasis. An entrance animation on `[data-active]` stops early if the next segment starts before the animation ends.

```css
@keyframes pop-in {
  from { opacity: 0; transform: scale(0.5); }
}
ef-text-segment {
  animation: pop-in 0.4s calc(var(--ef-stagger-offset)) both;
}
```

**`ef-captions`** accepts caption data in three ways:

- `captions-src` — a URL to a JSON file.
- `captions-script` — the id of an inline `<script type="application/json">` element.
- `captions.captionsData = {...}` — a JavaScript property, not an HTML attribute. Use this for a transcript your code generates dynamically.

The JSON data uses a `segments` shape or a `word_segments` shape. Each word or segment carries a `start` and an `end`, in seconds or in milliseconds. Editframe detects the unit from the magnitude of the number.

Style the active word through the `ef-captions-active-word` part or child. Or use `--ef-word-index`/`--ef-word-seed` for a per-word stagger effect.

**`ef-waveform`** visualizes an `ef-audio` or `ef-video` `target`. Choose a `mode`: `bars`, `line`, `curve`, `bricks`, `pixel`, `wave`, `spikes`, or `roundBars`.

**`ef-surface`** mirrors another element's pixels onto its own canvas. Set `target` to a canvas or to any `HTMLElement`. Use it to reuse a video's decoded frames in a second, differently-styled element, with no re-decoding.

## Rendering

**Browser export.** Call `renderTimegroupToVideo(timegroup, options)`, from `@editframe/elements`, to encode a live, laid-out `ef-timegroup` to a video file. This function uses WebCodecs and drives the same `seekForRender` path as playback.

Key options:

- `width`/`height`/`fps`
- `from`/`to` — the export range, in seconds.
- `videoCodec`/`audioCodec`/`videoBitrate`/`audioBitrate`
- `target` — a `mediabunny` output target.
- `signal` — an `AbortSignal`.
- `onProgress(({ frame, totalFrames, time, duration }) => ...)`

A direct call seeks and changes the `timegroup` you pass in. Only call it directly when that composition is not also a live, interactive preview.

To export a composition someone is actively viewing or editing, do not call `createRenderClone` directly. This function is an internal primitive, not a public API. Use one of these two paths instead:

- For a custom in-app export action, call `ef-workbench`'s `exportVideo()` method (see the `editor-gui` skill). This method clones, renders, and disposes of the offscreen copy for you.
- For CLI or cloud rendering (`editframe render`), do nothing extra. This path already runs through `window.EF_RENDER`, which installs automatically and handles the offscreen clone for you.

**Custom render data.** A CLI or Playwright host can inject arbitrary JSON into `window.EF_RENDER_DATA` before it runs your composition. Read this data in the browser with `getRenderData<T>()` (a module-level function) or with the `useRenderData<T>()` React hook. Use this to parameterize a render, for example with a user's name, without templating the composition itself.

**CLI and cloud rendering.** This skill covers only in-browser export. For `editframe render`, `editframe transcribe`, and the Editframe API's server-side render and transcription jobs, see the `editframe-cli` and `editframe-api` skills. Transcription produces WhisperX-generated caption JSON, compatible with `ef-captions`.

## React

Every React composition that renders or exports needs a `TimelineRoot` wrapper. `TimelineRoot` mounts your composition. It also registers a clone factory. `exportVideo()` and CLI rendering (see Rendering above) use this factory to create the offscreen render clone. With the factory, the clone is a live second React mount, with working hooks, `initializer`, and `onFrame` closures. Without it, the clone is a dead `cloneNode` copy with none of these.

```tsx
const MyTimeline = ({ id }: { id: string }) => (
  <Timegroup id={id} mode="sequence">
    <MyScenes />
  </Timegroup>
);

<TimelineRoot id="root" component={MyTimeline} />
```

The `component` prop must be a `React.ComponentType<{ id: string }>`. It must render a `<Timegroup id={id}>` at its root, directly or through a nested custom component. `TimelineRoot` forwards `id` to `component` on every mount, live and cloned.

Hooks (all from `@editframe/react`):

- `useTimingInfo()` — attach the returned `ref` to a `Timegroup`. The component re-renders with `{ ownCurrentTime, duration, percentComplete }` (seconds) on every frame.
- `useMediaInfo(ref)` — pass a ref to a `Video` or `Audio` element. Returns `{ readyState, duration, currentTime, paused }`.
- `usePanZoomTransform(ref)` — pass a ref to a `PanZoom` element. Returns `{ transform: { x, y, scale }, reset(), fitToContent(padding?), screenToCanvas(x, y), canvasToScreen(x, y) }`.
- `useRenderData<T>()` — see Rendering above.
- `usePlayback(target)` — subscribes to play, pause, seek, and volume state, for building custom preview controls. The ready-made GUI components in the `editor-gui` skill replace most uses of this hook.

## Advanced

**Configuration.** `ef-configuration`/`<Configuration>` supplies media routing and authentication settings. It is optional when local media loads directly and needs no API routes or signing.

For local JIT transcoding, set `api-host` on an ancestor configuration before its media children connect. Use the browser origin that exposes the dev-server routes. See the `dev-server` skill for framework setup.

For authenticated media, configure `api-host` and `signing-url` for the deployment. The `image-proxy` attribute controls cross-origin image proxying. See the Element Reference below for the full attribute list.

`media-engine` is reserved for future use. Local rendering is currently the only engine.

**React Three Fiber.** Wrap a `<Timegroup>` child in `<CompositionCanvas>`, from `@editframe/react/r3f`. This gives you an R3F `<Canvas>` synced to composition time. Read the clock inside a scene component with `useCompositionTime()`, which returns `{ time, duration }` in seconds.

```tsx
<Timegroup mode="fixed" duration="14s">
  <CompositionCanvas shadows>
    <MyScene />
  </CompositionCanvas>
</Timegroup>
```

To render 3D in a Web Worker, and keep the main thread free, use `OffscreenCompositionCanvas`. Construct the `Worker` yourself. Drive it with `@react-three/offscreen`'s own `render()` function, called inside the worker script. There is no `renderOffscreen` export.

**Server-side rendering.** `@editframe/react/server` and `@editframe/elements/server` export composition components and types only. They contain no custom-element registration and no DOM, canvas, or WebCodecs code. Import them safely in Next.js or Remix server code.

These server entry points do not include GUI components or hooks. Render those on the client instead, with `dynamic(() => import("@editframe/react"), { ssr: false })` or an equivalent.

For Next.js, wrap `next.config.js` with `withEditframe()`, from `@editframe/nextjs-plugin`. See the `dev-server` skill for setup and options. See the `editframe-create` skill's `nextjs` template for a working example.

`getRenderInfo()`, from either server entry point, still requires a live `document` with a mounted `ef-timegroup` at call time. Call it only inside a rendered page, for example from a Playwright-driven CLI or cloud host. Do not call it to parse an HTML string on the server.

**Package entry points**

| Import | Environment | Contains |
|---|---|---|
| `@editframe/elements` | Browser | All custom elements, canvas/WebCodecs rendering. |
| `@editframe/elements/server` | Browser, Node, SSR | Types only, plus `getRenderInfo()` (browser-only at runtime). |
| `@editframe/elements/gui` | Browser | Editor GUI custom elements (timeline, scrubber, handles, ...) — see the `editor-gui` skill. |
| `@editframe/elements/styles.css`, `/theme.css` | Browser | Base + theme styles. |
| `@editframe/react` | Browser | React composition + GUI components, hooks. |
| `@editframe/react/server` | Browser, Node, SSR | Composition components only, no hooks/GUI. |
| `@editframe/react/r3f` | Browser | `CompositionCanvas`, `OffscreenCompositionCanvas`, `useCompositionTime`. |

## Styling

Elements use standard CSS or Tailwind. Position a child with `absolute`. Size it with `w-full h-full` or with `size-full`.

## Composition Practices

Choose a structure that supports the intended sequence and later edits. The following guidance applies to HTML and React compositions.

### Scene structure

Use nested timegroups when scenes need independent local clocks. Choose `contain`, `fixed`, or `fit` from the duration model above. A scene's `ownCurrentTime` starts at zero, which keeps its animation independent of earlier scenes.

A `sequence` applies one `overlap` value to all adjacent children. Use separate groups or explicit offsets when transitions need different durations. For overlaps shorter than both adjacent scenes, total duration equals `sum(durations) − overlap × (n−1)`. Each declared scene duration includes its transition windows.

The sequence hides inactive scenes. Add scene-level opacity only when the visual design needs it, such as a crossfade. The transition variables describe the overlap window; they do not require every element to enter or exit together.

Keep scene-specific animation with the scene. Use a parent frame task when motion coordinates several scenes or a persistent overlay. Derive state from the supplied time so direct seeks and reverse seeks reproduce the same frame. An incremental simulation needs a deterministic reset and replay strategy.

### Animation

Choose CSS keyframes for motion that a timeline describes directly. Choose `addFrameTask` or React `onFrame` for procedural geometry, counters, or other computed state. Both use the composition clock. Match entrances, holds, and exits to the design instead of a single reveal pattern. Use the motion-design catalog when you choose a reveal, transition, or attention device.

- For repeated elements, compute fixed delays from their indices once.
- For ambient loops, use CSS keyframes with an appropriate phase for each item.
- For separate transforms, use nested wrappers or explicit transform composition.
- For an exit during a sequence overlap, use `--ef-transition-out-start` and `--ef-transition-duration`.

Set animation fill modes from the intended state before and after each animation:

- Use `backwards` to apply the first keyframe during a delay.
- Use `forwards` to retain the last keyframe after completion.
- Use `both` when both states need to persist.

These rules also apply to text segments. Editframe does not add a fill mode automatically. Check overlapping animations on the same property; a retained state can override another animation.

A CSS transform animation replaces the static transform by default. A separate wrapper can preserve layout transforms, such as centering, while the inner element animates.

### Assets

Use asset URLs that the preview and export host can both resolve. Follow the project's framework and dev-server configuration for local paths. Local media lookup depends on the configured dev-server `root`.

When a bundler must include an asset, use an asset import or another supported bundler reference. Placement inside `src/` alone does not inline a file. Public-directory files need a host or a separate packaging step. Check the final export environment for unresolved URLs.

Keep editable source assets when later changes need them. Use composition attributes for temporal edits such as trims and offsets. Preprocess media when the required effect needs it, such as loudness normalization. Avoid repeated destructive edits to the only source file.

In React, `<Image>` wraps a custom element. It takes no `alt` prop. Use an element ref compatible with `HTMLElement`, not `HTMLImageElement`.

### Audio

Include audio in the composition when preview timing and export timing need to match.

A direct child of a `sequence` becomes another beat. Put a continuous music bed beside the sequence, under an outer timegroup. Use `fit` for a bed that follows an unknown duration, as shown above. For a fixed runtime, constrain the bed to that duration. A short audio source needs an explicit repeat strategy if it must cover a longer video.

Place scene-specific sound cues inside that scene. Set `offset` relative to the scene's start. Use `sourcein`/`sourceout` and `trimstart`/`trimend` for source selection and temporal trims.

`volume` is a linear gain value, not decibels. The elements clamp it to the range 0–1. Values above 1 do not amplify the source. Apply offline gain when amplification is necessary. Check for clipping.

### Verification

Inspect representative frames during development. Include the opening, text-heavy frames, transition boundaries, and the ending. A browser screenshot after an awaited `seekForRender()` supports layout checks. Exported frames also reveal capture differences.

Render the intended output before delivery. Watch the rendered video for timing, continuity, legibility, and transitions. Listen for cue placement, speech clarity, music balance, and clipping. A successful encode alone does not establish visual or audio quality.

Check the output metadata for duration, dimensions, frame rate, and audio streams. Use the actual output path:

```bash
ffprobe output/demo.mp4
ffmpeg -i output/demo.mp4 -af volumedetect -f null -
```

Volume statistics help detect silence or clipping risk. They do not replace listening. If rendering or inspection is unavailable, report the limitation and the checks that remain.

## Element Reference

### `ef-audio`

`<ef-audio>` plays audio in a composition.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `fft-decay` | `fftDecay` | number | `8` | Decay frames averaged into `getFrequencyData` (default 8). |
| `fft-gain` | `fftGain` | number | `3` | Linear gain applied before frequency analysis (default 3.0). |
| `fft-size` | `fftSize` | number | `128` | FFT window size for `getFrequencyData`/`getTimeDomainData` (rounded to a power of two, default 128). |
| `file-id` | `fileId` | string \| null | — | Cloud file identifier — resolves to `${apiHost}/api/v1/files/${fileId}`, taking priority over `src`. |
| `interpolate-frequencies` | `interpolateFrequencies` | boolean | `false` | Smooths `getFrequencyData` bins by interpolating between FFT bands instead of nearest-neighbor sampling. |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `mute` | `muted` | boolean | `false` | Mutes this element's audio. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `sourcein` | `sourcein` | string | — | Start time within the source file (CSS time, e.g. `"1.5s"`). |
| `sourceout` | `sourceout` | string | — | End time within the source file (CSS time, e.g. `"1.5s"`). |
| `src` | `src` | string | — | URL of the source audio file. |
| `trimend` | `trimend` | string | — | Trims this much off the end of the source (CSS time). |
| `trimstart` | `trimstart` | string | — | Trims this much off the start of the source (CSS time). |
| `volume` | `volume` | number | `1` | Audio volume (0.0 to 1.0). |

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.

### `ef-captions`

`<ef-captions>` displays synchronized captions with word-level highlighting.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `captions-script` | `captionsScript` | string | `""` | ID of a `<script type="application/json">` element containing caption data, as an alternative to `captionsSrc`. |
| `captions-src` | `captionsSrc` | string | `""` | URL or path to a JSON file with `segments`/`word_segments` caption data. |
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `target` | `target` | string | `""` | ID of the `<ef-video>`/`<ef-audio>` element these captions are timed against. |
| `word-style` | `wordStyle` | string | `""` | Free-form styling hook (no built-in behavior) — mirrors `@editframe/elements`' `word-style` attribute so consumer CSS/selectors targeting it keep working (e.g. `ef-captions[word-style="highlight"]`). |

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.

### `ef-captions-active-word`

`<ef-captions-active-word>` wraps the word `<ef-captions>` is currently speaking.

### `ef-captions-after-active-word`

`<ef-captions-after-active-word>` wraps the caption text that comes after the active word, inside `<ef-captions>`.

### `ef-captions-before-active-word`

`<ef-captions-before-active-word>` wraps the caption text that comes before the active word, inside `<ef-captions>`.

### `ef-captions-segment`

`<ef-captions-segment>` groups one caption line's before/active/after word elements. `<ef-captions>` creates this element automatically unless you author your own inside it.

### `ef-configuration`

`<ef-configuration>` is the root configuration element.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `api-host` | `apiHost` | string | `""` | Base URL of the Editframe API used for file/asset requests. |
| `image-proxy` | `imageProxy` | "auto" \\| "none" | `"auto"` | Controls whether cross-origin `ef-image` sources are routed through the `/api/v1/assets/image` proxy (`"auto"`, default) or fetched directly (`"none"`). |
| `media-engine` | `mediaEngine` | string | `"local"` | Reserved for future engine switching; local rendering always uses the default codec set. |
| `signing-url` | `signingURL` | string | `"/@ef-sign-url"` | URL used to request signed bearer tokens for authenticated cross-origin media access (default `"/@ef-sign-url"`, matching `@editframe/elements`). |

**Fires**

- `playback-attached` (`{ controller: PlaybackController }`) — Fires when `EFConfigurationElement.attachPlayback` creates a new `PlaybackController`. This lets GUI controls that resolved their `PlaybackBridge` before the attach notice it without polling.

### `ef-image`

`<ef-image>` is a static image temporal leaf.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `asset-id` | `assetId` | string \| null | — | Deprecated alias for `file-id`. |
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `file-id` | `fileId` | string \| null | — | Cloud file identifier — resolves to `${apiHost}/api/v1/files/${fileId}`, taking priority over `src`. |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `src` | `src` | string | — | URL of the source image file. |

**CSS parts**

- `canvas` — The rendering canvas. This canvas is a light DOM child element, not a shadow DOM element.

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.
- `contentchange` (`{ reason: string }`) — Fires when the image source changes in a way that affects the rendering. For example, a new value for `src`, `file-id`, or `asset-id` triggers this event.

### `ef-motionblur`

`<ef-motionblur>` applies motion blur to its child.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `amount` | `amount` | number | `0` | Explicit blur amount in pixels. |
| `angle` | `angle` | number | `0` | Explicit blur direction in degrees. |
| `fps` | `fps` | number | `30` | Frame rate used to convert `shutterAngle` into a shutter duration. |
| `sensitivity` | `sensitivity` | number | `1` | Multiplier applied to detected motion before computing blur amount. |
| `shutter-angle` | `shutterAngle` | number | `180` | Simulated camera shutter angle in degrees — controls blur strength when auto-sampling (default 180). |
| `threshold` | `threshold` | number | `0.5` | Minimum motion magnitude (px/degrees) before any blur is applied. |

### `ef-pan-zoom`

`<ef-pan-zoom>` is a pan and zoom viewport.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `auto-fit` | `autoFit` | boolean | `false` | Automatically fits content to the viewport instead of using explicit `x`/`y`/`scale`. |
| `scale` | `scale` | number | `1` | Current zoom scale factor. |
| `x` | `x` | number | `0` | Current horizontal pan offset in pixels. |
| `y` | `y` | number | `0` | Current vertical pan offset in pixels. |

**CSS parts**

- `content` — The transformed wrapper. It applies the pan and zoom to the slotted content.

**Fires**

- `transform-changed` (`{ x: number; y: number; scale: number; }`) — Fires with `{ x, y, scale }` on every pan or zoom.

**Methods**

- `screenToCanvas(screenX: number, screenY: number): { x: number; y: number }` — Convert screen coordinates, for example `event.clientX` and `event.clientY`, to canvas space.
- `canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number }` — Convert canvas-space coordinates to screen space.
- `reset(): void` — Resets the pan and zoom to the identity transform (`x: 0, y: 0, scale: 1`).
- `fitToContent(padding?: number): void` — Centers and scales the content to fit the viewport. The `padding` parameter sets the margin, as a number from 0 to 1.

### `ef-surface`

`<ef-surface>` mirrors another element's pixels onto an internal canvas.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `target` | `target` | string | `""` | ID of the element (bitmap source or arbitrary `HTMLElement`) to mirror. |

**CSS parts**

- `canvas` — The rendering canvas. This canvas is a light DOM child element, not a shadow DOM element.

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.

### `ef-text`

`<ef-text>` is animated text with line, word, or character splitting.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `blur-amount` | `blur-amount` | number | — | Forwarded to the wrapping `<ef-motionblur>`'s `amount` when `motion-blur` is set. |
| `blur-angle` | `blur-angle` | number | — | Forwarded to the wrapping `<ef-motionblur>`'s `angle` when `motion-blur` is set. |
| `blur-fps` | `blur-fps` | number | — | Forwarded to the wrapping `<ef-motionblur>`'s `fps` when `motion-blur` is set. |
| `blur-sensitivity` | `blur-sensitivity` | number | — | Forwarded to the wrapping `<ef-motionblur>`'s `sensitivity` when `motion-blur` is set. |
| `blur-shutter-angle` | `blur-shutter-angle` | number | — | Forwarded to the wrapping `<ef-motionblur>`'s `shutter-angle` when `motion-blur` is set. |
| `blur-threshold` | `blur-threshold` | number | — | Forwarded to the wrapping `<ef-motionblur>`'s `threshold` when `motion-blur` is set. |
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `easing` | `easing` | string | `"linear"` | CSS easing keyword applied to stagger timing. |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `motion-blur` | `motionBlur` | boolean | `false` | Wraps each segment in an `<ef-motionblur>` element for auto-detected directional blur. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `split` | `split` | "line" \\| "word" \\| "char" | `"word"` | Splits text into segments by line, word, or character for staggered animation. |
| `stagger` | `stagger` | string | `""` | Delay between each split segment's animation start (CSS time, e.g. `"100ms"`). |

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.

### `ef-text-segment`

`<ef-text-segment>` is one staggered unit of an `EFTextElement`.

### `ef-timegroup`

`<ef-timegroup>` is a temporal container.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | string | — | Fixed duration when `mode="fixed"` (CSS time, e.g. `"5s"`); ignored in other modes. |
| `fps` | `fps` | number | — | Rendering frame rate. |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `mode` | `mode` | "fixed" \\| "sequence" \\| "contain" \\| "fit" | `"contain"` | Duration calculation mode. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `overlap` | `overlap` | number | `0` | Overlap time between adjacent `sequence`-mode items (e.g. `"1s"`). |

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.
- `playback-attached` (`{ controller: PlaybackController }`) — _TODO: document this event._

**Methods**

- `addFrameTask(callback: FrameTaskCallback): () => void` — Registers a per-frame callback function. The method returns an unregister function.
- `waitForContentReady(): Promise<void>` — Waits for this timegroup and for the temporal children that matter for the current presentation. In sequence mode, this method waits only on the active scene. A wait on every idle sibling once hung the Showcase export indefinitely, because a later clip's `#load()` method contended for a shared registry input.
- `seekForRender(time: number, options?: SeekForRenderOptions): Promise<void>` — When `strictVideoPaint` is `true`, this method also verifies that every active `ef-video` descendant painted a sample that covers this seek's playhead — not merely that some earlier sample is still on the canvas (`hasPaintedFrame` is sticky). A stale canvas would encode N-1 at cuts. The method retries briefly before it throws. This check costs a few extra microtask turns, so use it for a final-render capture, not for an interactive preview. See the base `TemporalElement.seekForRender` method, for the deterministic sync and content-readiness contract that this method builds on.
  - `options.strictVideoPaint` (optional): `boolean` — When true, also verify that every active `<ef-video>` descendant painted a sample for this frame. A resolved metadata state alone is not enough. See `EFTimegroupElement.seekForRender` for the full check. This option has no effect in the base implementation, because only a container can walk its descendants.
  - `options.preferProxy` (optional): `boolean` — When true, prefer the lightweight scrub or low proxy, if the ladder has one. Set this option in timeline filmstrips and composition thumbnails. This stops a heavy scene from opening every clip's play-tier (`role=high`) input, just to paint a small preview. Leave this option unset for a final export or for `EF_FRAMEGEN`, so `sync` still waits for the play tier.
  - `options.signal` (optional): `AbortSignal` — Use this signal to abort an in-flight prepare or present step, such as a SampleChase pump or an iterator `next` call. `EF_FRAMEGEN` uses this option when a newer `beginFrame` call replaces a stalled one.

### `ef-video`

`<ef-video>` is a video temporal leaf.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `fft-decay` | `fftDecay` | number | `8` | Decay frames averaged into `getFrequencyData` (default 8). |
| `fft-gain` | `fftGain` | number | `3` | Linear gain applied before frequency analysis (default 3.0). |
| `fft-size` | `fftSize` | number | `128` | FFT window size for `getFrequencyData`/`getTimeDomainData` (rounded to a power of two, default 128). |
| `file-id` | `fileId` | string \| null | — | Cloud file identifier — resolves to `${apiHost}/api/v1/files/${fileId}`, taking priority over `src`/`variants`. |
| `interpolate-frequencies` | `interpolateFrequencies` | boolean | `false` | Smooths `getFrequencyData` bins by interpolating between FFT bands instead of nearest-neighbor sampling. |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `mute` | `muted` | boolean | `false` | Mutes the video's audio track. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `play-role` | `playRole` | "low" \\| "high" | `"high"` | Preferred variant-ladder quality tier during playback (as opposed to scrub). |
| `sourcein` | `sourcein` | string | — | Start time within the source file (CSS time, e.g. `"1.5s"`). |
| `sourceout` | `sourceout` | string | — | End time within the source file (CSS time, e.g. `"1.5s"`). |
| `src` | `src` | string | — | URL of the source video file. |
| `trimend` | `trimend` | string | — | Trims this much off the end of the source (CSS time). |
| `trimstart` | `trimstart` | string | — | Trims this much off the start of the source (CSS time). |
| `variant-mode` | `variantMode` | "single-high" \\| "scrub-upgrade" \\| "multi-bitrate" \\| "scrub-plus-ladder" | `"scrub-upgrade"` | Variant-ladder role-selection strategy when `variants` is set. |
| `variants` | `variants` | string | `""` | URL of a variant-ladder manifest (multiple resolutions/bitrates), used instead of `src`. |
| `volume` | `volume` | number | `1` | Audio volume (0.0 to 1.0). |

**CSS parts**

- `canvas` — The frame-rendering canvas. This canvas is a light DOM child element, not a shadow DOM element.

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.
- `variantchange` (`{ role: "scrub" \| "low" \| "high"; url: string; window: number \| null }`) — Fires when the active decode variant changes, for example its role, its URL, or its scrub window.

### `ef-waveform`

`<ef-waveform>` is a live audio-reactive waveform visualization, bound to an `ef-audio` or an `ef-video` target.

**Attributes**

| Attribute | React prop | Type | Default | Description |
|---|---|---|---|---|
| `bar-spacing` | `barSpacing` | number | `0.5` | Ratio of spacing between bars (0-1) in bar-based visual modes. |
| `color` | `color` | string | `"currentColor"` | `"currentColor"` (default) resolves the host's computed CSS `color`. |
| `duration` | `duration` | string | — | How long this element is active (CSS time, e.g. `"5s"`). |
| `line-width` | `lineWidth` | number | `4` | Stroke width (px) in line/curve visual modes. |
| `loop` | `loop` | boolean | `false` | Loop attribute — when this temporal is a self-driving root under a `PlaybackController`, the controller wraps back to `0` instead of pausing at `duration`. |
| `mode` | `mode` | "line" \\| "bars" \\| "roundBars" \\| "bricks" \\| "curve" \\| "pixel" \\| "wave" \\| "spikes" | `"bars"` | Visual style of the waveform. |
| `offset` | `offset` | number | — | Start offset (seconds) within a parallel (`fixed`/`contain`/`fit`) parent timegroup. |
| `target` | `target` | string | `""` | ID of the `<ef-audio>`/`<ef-video>` element to visualize. |

**CSS parts**

- `canvas` — The rendering canvas. This canvas is a light DOM child element, not a shadow DOM element.

**Fires**

- `child-duration-changed` (`{ duration: number }`) — Fires on the nearest context-providing ancestor, when a nested media element's duration becomes known or changes.
