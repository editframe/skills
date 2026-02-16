---
title: Package Entry Points
description: Complete guide to @editframe/react package exports and when to use each
type: reference
nav:
  parent: "Advanced / Package Configuration"
  priority: 90
api:
  entry_points:
    - path: "."
      description: Full browser package (all components and hooks)
      safe_in: ["browser"]
      exports:
        - All composition components
        - All GUI components
        - All hooks
        - Browser utilities
    - path: "./server"
      description: SSR-safe composition components only
      safe_in: ["browser", "node", "ssr"]
      exports:
        - Timegroup, Video, Audio, Image
        - Text, TextSegment
        - Captions + sub-components
        - Surface, Waveform, PanZoom
        - All types from @editframe/elements/server
    - path: "./r3f"
      description: React Three Fiber integration
      safe_in: ["browser"]
      exports:
        - CompositionCanvas
        - OffscreenCompositionCanvas
        - useCompositionTime
        - renderOffscreen
        - Worker protocol types
---

# Package Entry Points

`@editframe/react` provides three entry points to support different environments and use cases.

## Entry Points Overview

```typescript
// Browser: Full package
import { Timegroup, Video, Workbench } from "@editframe/react";

// SSR: Composition components only
import { Timegroup, Video } from "@editframe/react/server";

// Browser: React Three Fiber
import { CompositionCanvas } from "@editframe/react/r3f";
```

## Main Entry (`.`)

**Path:** `@editframe/react`

**Environment:** Browser only

### What's Included

**Composition Components:**
- `Timegroup`, `Video`, `Audio`, `Image`
- `Text`, `TextSegment`
- `Captions` + sub-components
- `Surface`, `Waveform`, `PanZoom`

**GUI Components:**
- `Preview`, `Workbench`, `Controls`
- `Timeline`, `Filmstrip`, `TimelineRuler`
- `Scrubber`, `TimeDisplay`, `TrimHandles`
- `Canvas`, `TransformHandles`, `Hierarchy`
- `Play`, `Pause`, `TogglePlay`, `ToggleLoop`
- `OverlayLayer`, `OverlayItem`
- `FocusOverlay`, `FitScale`, `ActiveRootTemporal`
- `Dial`, `ResizableBox`

**Hooks:**
- `useTimingInfo`, `usePlayback`
- `usePanZoomTransform`, `useMediaInfo`
- All composition-related hooks

**Utilities:**
- `Configuration`, `TimelineRoot`
- Browser rendering utilities

### Basic Usage

```tsx
import {
  Timegroup,
  Video,
  Audio,
  Text,
  Preview,
  Workbench,
  useTimingInfo,
} from "@editframe/react";

export const VideoEditor = () => {
  const { currentTimeMs, durationMs } = useTimingInfo();

  return (
    <Workbench rendering={false}>
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        <Video src="/intro.mp4" className="size-full" />
        <Audio src="/music.mp3" volume={0.3} />
        <Text className="absolute inset-0 flex items-center justify-center text-6xl">
          Hello World
        </Text>
      </Timegroup>
    </Workbench>
  );
};
```

### Do NOT Use In

- Server-side rendering (will crash)
- Node.js scripts
- React Server Components

## Server Entry (`./server`)

**Path:** `@editframe/react/server`

**Environment:** Browser, Node.js, SSR

### What's Included

**Composition Components Only:**
- `Timegroup`, `Video`, `Audio`, `Image`
- `Text`, `TextSegment`
- `Captions`, `CaptionsActiveWord`, `CaptionsBeforeActiveWord`, `CaptionsAfterActiveWord`, `CaptionsSegment`
- `Surface`, `Waveform`, `PanZoom`

**Types:**
- All render types from `@editframe/elements/server`
- All component prop types

### What's NOT Included

- GUI components (Preview, Workbench, Timeline, etc.)
- Hooks (useTimingInfo, usePlayback, etc.)
- Browser utilities

### Basic Usage

```tsx
// Safe in SSR
import { Timegroup, Video, Audio } from "@editframe/react/server";

export const VideoComposition = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
      <Video src="/intro.mp4" className="size-full" />
      <Audio src="/music.mp3" volume={0.3} />
    </Timegroup>
  );
};
```

### Use Cases

- Server-side rendering (Next.js, Remix)
- Pre-rendering static HTML
- React Server Components
- Node.js rendering utilities

### Next.js Example

```tsx
// app/video/page.tsx (Server Component)
import { Timegroup, Video } from "@editframe/react/server";

export default function VideoPage() {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
      <Video src="/video.mp4" className="size-full" />
    </Timegroup>
  );
}
```

For editor UI, use dynamic imports:

```tsx
import dynamic from "next/dynamic";
import { Timegroup, Video } from "@editframe/react/server";

const Workbench = dynamic(
  () => import("@editframe/react").then((m) => m.Workbench),
  { ssr: false }
);

export default function EditorPage() {
  return (
    <>
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        <Video src="/video.mp4" className="size-full" />
      </Timegroup>
      <Workbench rendering={false} />
    </>
  );
}
```

## R3F Entry (`./r3f`)

**Path:** `@editframe/react/r3f`

**Environment:** Browser only

### What's Included

**Components:**
- `CompositionCanvas` - Main-thread R3F canvas
- `OffscreenCompositionCanvas` - Web worker R3F canvas

**Hooks:**
- `useCompositionTime` - Timeline synchronization hook

**Functions:**
- `renderOffscreen` - Worker-side entry point

**Types:**
- `CompositionCanvasProps`, `OffscreenCompositionCanvasProps`
- Worker protocol types (`MainToWorkerMessage`, `WorkerToMainMessage`, etc.)

### Basic Usage

```tsx
import { Timegroup } from "@editframe/react";
import { CompositionCanvas, useCompositionTime } from "@editframe/react/r3f";

function RotatingBox() {
  const { timeMs } = useCompositionTime();
  return <box rotation={[0, timeMs / 1000, 0]} />;
}

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px]">
      <CompositionCanvas>
        <RotatingBox />
      </CompositionCanvas>
    </Timegroup>
  );
};
```

### Use Cases

- 3D motion graphics with React Three Fiber
- Three.js integration with Editframe timelines
- WebGL animations

### Do NOT Use In

- Server-side rendering
- Browsers without WebGL support

## Entry Point Decision Tree

### For Browser Applications

```
Do you need 3D rendering?
├─ Yes → @editframe/react/r3f
└─ No → @editframe/react
```

### For SSR Applications

```
Is this a Server Component / SSR function?
├─ Yes → @editframe/react/server
└─ No (Client Component)
   ├─ Need editor UI?
   │  └─ Yes → @editframe/react (with dynamic import)
   └─ Need composition only?
      └─ Yes → @editframe/react/server
```

### For Node.js Scripts

```
What do you need?
├─ Render React to HTML → @editframe/react/server (with react-dom/server)
├─ Type definitions → @editframe/react/server (type imports)
└─ Extract metadata → @editframe/elements/server (getRenderInfo)
```

## Import Examples

### Browser App

```tsx
// main.tsx
import ReactDOM from "react-dom/client";
import {
  Configuration,
  TimelineRoot,
  Timegroup,
  Video,
  Workbench,
} from "@editframe/react";
import "@editframe/elements/styles.css";

const Video = () => (
  <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
    <Video src="/video.mp4" className="size-full" />
  </Timegroup>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Configuration mediaEngine="local">
    <TimelineRoot id="root" component={Video} />
  </Configuration>
);
```

### SSR App (Next.js)

```tsx
// app/video/page.tsx (Server Component)
import { Timegroup, Video } from "@editframe/react/server";

export default function VideoPage() {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
      <Video src="/video.mp4" className="size-full" />
    </Timegroup>
  );
}
```

### SSR App with Editor UI

```tsx
// pages/editor.tsx
import dynamic from "next/dynamic";
import { Timegroup, Video } from "@editframe/react/server";

const Workbench = dynamic(
  () => import("@editframe/react").then((m) => m.Workbench),
  { ssr: false }
);

export default function EditorPage() {
  return (
    <>
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        <Video src="/video.mp4" className="size-full" />
      </Timegroup>
      <Workbench rendering={false} />
    </>
  );
}
```

### 3D Scene

```tsx
// Video.tsx
import { Timegroup } from "@editframe/react";
import { CompositionCanvas, useCompositionTime } from "@editframe/react/r3f";

function Scene() {
  const { timeMs } = useCompositionTime();
  return <box rotation={[0, timeMs / 1000, 0]} />;
}

export const Video = () => {
  return (
    <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px]">
      <CompositionCanvas>
        <Scene />
      </CompositionCanvas>
    </Timegroup>
  );
};
```

### Node.js Pre-rendering

```typescript
// build.ts
import { renderToString } from "react-dom/server";
import { Timegroup, Video } from "@editframe/react/server";
import { writeFileSync } from "fs";

const composition = (
  <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
    <Video src="/video.mp4" className="size-full" />
  </Timegroup>
);

const html = renderToString(composition);
writeFileSync("./dist/composition.html", html);
```

## Package.json Structure

```json
{
  "name": "@editframe/react",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      }
    },
    "./server": {
      "import": {
        "types": "./dist/server.d.ts",
        "default": "./dist/server.js"
      }
    },
    "./r3f": {
      "import": {
        "types": "./dist/r3f/index.d.ts",
        "default": "./dist/r3f/index.js"
      }
    }
  }
}
```

## Common Errors

### Error: `customElements is not defined`

**Problem:** Imported main entry during SSR.

**Solution:**
```tsx
// ❌ Wrong
import { Timegroup } from "@editframe/react";

// ✅ Correct
import { Timegroup } from "@editframe/react/server";
```

### Error: `Cannot find module '@editframe/react/server'`

**Problem:** Outdated package version.

**Solution:**
```bash
npm install @editframe/react@latest
```

Requires version 0.37.0 or higher.

### Error: GUI component not found in `/server`

**Problem:** Trying to import GUI component from SSR entry.

**Solution:** Use dynamic import:
```tsx
const Workbench = dynamic(
  () => import("@editframe/react").then((m) => m.Workbench),
  { ssr: false }
);
```

### Error: `window is not defined`

**Problem:** Browser code running on server.

**Solution:** Check environment:
```tsx
if (typeof window !== "undefined") {
  // Browser-only code
}
```

## Comparison with @editframe/elements

`@editframe/react` wraps `@editframe/elements` Web Components:

| @editframe/elements | @editframe/react | Environment |
|---------------------|------------------|-------------|
| `.` | `.` | Browser |
| `./server` | `./server` | Browser, Node, SSR |
| `./node` | N/A | Browser, Node, SSR |
| N/A | `./r3f` | Browser |
| `./styles.css` | N/A | Browser |
| `./theme.css` | N/A | Browser |

Import CSS from `@editframe/elements`:
```tsx
import "@editframe/elements/styles.css";
import "@editframe/elements/theme.css"; // Optional
```

## Type-Only Imports

Always safe in any environment:

```typescript
import type {
  TimegroupProps,
  VideoProps,
  RenderToVideoOptions,
} from "@editframe/react/server";

function createVideoProps(): VideoProps {
  return {
    src: "/video.mp4",
    className: "size-full",
  };
}
```

## Related

- [server-rendering.md](server-rendering.md) - SSR integration guide
- [r3f.md](r3f.md) - React Three Fiber integration
- [configuration.md](configuration.md) - Configuration component
- [getting-started.md](getting-started.md) - Installation and setup
