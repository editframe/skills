---
title: Server-Side Rendering
description: SSR-safe imports and Next.js/Remix integration for Editframe
type: reference
nav:
  parent: "Advanced / Server Integration"
  priority: 85
api:
  entry_points:
    - name: "@editframe/react/server"
      description: SSR-safe React composition components
      exports:
        - Audio
        - Captions
        - CaptionsActiveWord
        - CaptionsAfterActiveWord
        - CaptionsBeforeActiveWord
        - CaptionsSegment
        - Text
        - TextSegment
        - Image
        - Surface
        - Timegroup
        - Video
        - Waveform
        - PanZoom
        - RenderToVideoOptions (type)
        - RenderProgress (type)
---

# Server-Side Rendering

Editframe provides an SSR-safe entry point for server-side rendering with Next.js, Remix, and other React frameworks.

## Problem: Browser APIs in SSR

The main entry point (`@editframe/react`) imports browser-specific code at the module level:
- Web Components (`customElements.define()`)
- DOM APIs (`document`, `window`)
- Browser-only hooks
- Canvas, WebGL, WebCodecs APIs

This code **will crash** during server-side rendering because Node.js doesn't provide these APIs.

## Solution: SSR-Safe Entry Point

Import from `@editframe/react/server` to access composition components without triggering browser code:

```tsx
import {
  Timegroup,
  Video,
  Audio,
  Image,
  Text,
  Captions,
  Surface,
  Waveform,
  PanZoom,
} from "@editframe/react/server";
```

## What's Included

**Composition Components:**
- `Timegroup` - Timeline container
- `Video`, `Audio`, `Image` - Media elements
- `Text`, `TextSegment` - Text rendering
- `Captions` + sub-components - Caption styling
- `Surface` - Element mirroring
- `Waveform` - Audio visualization
- `PanZoom` - Pan/zoom container

**Types:**
- All render option types (`RenderToVideoOptions`, `RenderProgress`, etc.)
- All component prop types

## What's NOT Included

**GUI Components:**
- `Preview`, `Workbench`, `Timeline`, `Controls`
- `Scrubber`, `Filmstrip`, `TimelineRuler`
- `Canvas`, `TransformHandles`, `Hierarchy`
- Any editor/preview UI components

**Hooks:**
- `useTimingInfo`, `usePlayback`, `useCompositionTime`
- `usePanZoomTransform`, `useMediaInfo`
- All browser-dependent hooks

**Browser Utilities:**
- `renderToVideo`, `createRenderClone`
- Browser-specific helpers

## Next.js Integration

### App Router (React Server Components)

Import from `/server` in Server Components:

```tsx
// app/video/[id]/page.tsx (Server Component)
import { Timegroup, Video, Audio } from "@editframe/react/server";

interface Props {
  params: { id: string };
}

export default function VideoPage({ params }: Props) {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <Video src={`/api/videos/${params.id}/intro.mp4`} className="size-full" />
      <Audio src={`/api/videos/${params.id}/music.mp3`} volume={0.3} />
    </Timegroup>
  );
}
```

### Pages Router (getServerSideProps)

```tsx
// pages/video/[id].tsx
import type { GetServerSideProps } from "next";
import { Timegroup, Video } from "@editframe/react/server";

interface Props {
  videoUrl: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const videoUrl = await fetchVideoUrl(params?.id);
  return { props: { videoUrl } };
};

export default function VideoPage({ videoUrl }: Props) {
  return (
    <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px]">
      <Video src={videoUrl} className="size-full" />
    </Timegroup>
  );
}
```

### Client-Only Components

For editor UI components, use dynamic imports with `ssr: false`:

```tsx
// pages/editor.tsx
import dynamic from "next/dynamic";
import { Timegroup, Video } from "@editframe/react/server";

// ✅ Safe: SSR-safe components
const composition = (
  <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
    <Video src="/video.mp4" className="size-full" />
  </Timegroup>
);

// ✅ Safe: Client-only dynamic import
const Workbench = dynamic(
  () => import("@editframe/react").then((mod) => mod.Workbench),
  { ssr: false }
);

const Preview = dynamic(
  () => import("@editframe/react").then((mod) => mod.Preview),
  { ssr: false }
);

export default function EditorPage() {
  return (
    <div>
      {composition}
      <Workbench rendering={false} />
    </div>
  );
}
```

## Remix Integration

### Loaders and Server Code

Use `/server` entry in loaders and server-side code:

```tsx
// routes/video.$id.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Timegroup, Video, Audio } from "@editframe/react/server";

export async function loader({ params }: LoaderFunctionArgs) {
  const videoData = await fetchVideoData(params.id);
  return json({ videoData });
}

export default function VideoRoute() {
  const { videoData } = useLoaderData<typeof loader>();

  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <Video src={videoData.introUrl} className="size-full" />
      <Audio src={videoData.musicUrl} volume={0.3} />
    </Timegroup>
  );
}
```

### Client-Only Components

Use `ClientOnly` from `remix-utils` for browser-only code:

```tsx
import { ClientOnly } from "remix-utils/client-only";
import { Timegroup, Video } from "@editframe/react/server";

export default function EditorRoute() {
  return (
    <>
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        <Video src="/video.mp4" className="size-full" />
      </Timegroup>

      <ClientOnly>
        {() => {
          const { Workbench } = require("@editframe/react");
          return <Workbench rendering={false} />;
        }}
      </ClientOnly>
    </>
  );
}
```

## Pre-rendering Static HTML

Generate static HTML for compositions in Node.js:

```tsx
// build.ts
import { renderToString } from "react-dom/server";
import { Timegroup, Video, Text } from "@editframe/react/server";
import { writeFileSync } from "fs";

const composition = (
  <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px] bg-black">
    <Video src="/assets/background.mp4" className="size-full object-cover" />
    <Text className="absolute inset-0 flex items-center justify-center text-6xl text-white">
      Hello World
    </Text>
  </Timegroup>
);

const html = renderToString(composition);
writeFileSync("./dist/composition.html", html);
console.log("✅ Composition HTML generated");
```

This HTML can then be hydrated on the client:

```tsx
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { Timegroup, Video, Text } from "@editframe/react"; // Full browser version

hydrateRoot(
  document.getElementById("root")!,
  <Timegroup mode="fixed" duration="10s" className="w-[1920px] h-[1080px] bg-black">
    <Video src="/assets/background.mp4" className="size-full object-cover" />
    <Text className="absolute inset-0 flex items-center justify-center text-6xl text-white">
      Hello World
    </Text>
  </Timegroup>
);
```

## Type-Only Imports

When you only need types (not runtime code), use type-only imports:

```typescript
// Safe in any environment (no runtime code)
import type { TimegroupProps, VideoProps, RenderToVideoOptions } from "@editframe/react/server";

function createVideoConfig(): VideoProps {
  return {
    src: "/video.mp4",
    className: "size-full",
  };
}

function createRenderOptions(): RenderToVideoOptions {
  return {
    fps: 30,
    codec: "h264",
    scale: 1,
  };
}
```

## Environment-Based Imports

Dynamically import based on environment:

```tsx
// VideoEditor.tsx
import type { FC } from "react";

let Timegroup: any;
let Video: any;
let Workbench: any;

if (typeof window === "undefined") {
  // Server: import from /server
  const server = await import("@editframe/react/server");
  Timegroup = server.Timegroup;
  Video = server.Video;
} else {
  // Browser: import from main entry
  const browser = await import("@editframe/react");
  Timegroup = browser.Timegroup;
  Video = browser.Video;
  Workbench = browser.Workbench;
}

export const VideoEditor: FC = () => {
  return (
    <>
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        <Video src="/video.mp4" className="size-full" />
      </Timegroup>
      {typeof window !== "undefined" && <Workbench rendering={false} />}
    </>
  );
};
```

## Typical Setup

### Development (main.tsx)

```tsx
// src/main.tsx (browser only)
import ReactDOM from "react-dom/client";
import { Configuration, TimelineRoot } from "@editframe/react";
import { Video } from "./Video";
import "@editframe/elements/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Configuration mediaEngine="local">
    <TimelineRoot id="root" component={Video} />
  </Configuration>
);
```

### Video Composition (Video.tsx)

```tsx
// src/Video.tsx (SSR-safe)
import { Timegroup, Video, Audio, Text } from "@editframe/react/server";

export const Video = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <Timegroup mode="fixed" duration="5s" className="absolute inset-0">
        <Video src="/assets/intro.mp4" className="size-full object-cover" />
      </Timegroup>
      <Timegroup mode="fixed" duration="10s" className="absolute inset-0">
        <Video src="/assets/main.mp4" className="size-full object-cover" />
        <Audio src="/assets/music.mp3" volume={0.3} />
        <Text className="absolute bottom-0 left-0 p-8 text-4xl text-white">
          Hello World
        </Text>
      </Timegroup>
    </Timegroup>
  );
};
```

This pattern works in:
- Browser (with `@editframe/react`)
- SSR (with `@editframe/react/server`)
- Static generation (with `@editframe/react/server`)

## Troubleshooting

### Error: `customElements is not defined`

**Problem:** Imported from main entry during SSR.

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

Ensure version is 0.37.0 or higher.

### Error: `window is not defined`

**Problem:** Browser code running on server.

**Solution:** Use dynamic import with `ssr: false` or check environment:
```tsx
if (typeof window !== "undefined") {
  // Browser-only code
}
```

### Component renders but doesn't work

**Problem:** Hydration mismatch between server and client.

**Solution:** Ensure identical imports on both sides or use client-only rendering:
```tsx
import dynamic from "next/dynamic";

const ClientComponent = dynamic(() => import("./Component"), {
  ssr: false,
});
```

## What About GUI Components?

GUI components like `Workbench`, `Preview`, and `Timeline` are **never** SSR-safe because they:
- Depend on browser APIs (`ResizeObserver`, `IntersectionObserver`, etc.)
- Use Web Components internally
- Require canvas and WebGL contexts
- Need interactive event handling

Always use dynamic imports for GUI components:

```tsx
const Workbench = dynamic(
  () => import("@editframe/react").then((m) => m.Workbench),
  { ssr: false }
);
```

## Related

- [entry-points.md](entry-points.md) - Complete package entry point reference
- [configuration.md](configuration.md) - Configuration component
- [getting-started.md](getting-started.md) - Installation and setup
