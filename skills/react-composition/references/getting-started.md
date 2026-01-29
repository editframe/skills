# Getting Started

Create a new React-based Editframe project.

## Create Project

```bash
npm create @editframe/elements -- react
```

Follow the prompts to name your project.

## Available React Templates

- `react` - Minimal React/TypeScript project
- `react-demo` - React demo with sample assets and animations

## Quick Start

```bash
npm create @editframe/elements -- react -d my-project
cd my-project
npm install
npm start
```

## Project Structure

```
my-project/
├── index.html
├── src/
│   ├── main.tsx          # Entry point
│   ├── Video.tsx         # Composition component
│   ├── styles.css        # Tailwind CSS
│   └── assets/           # Media files
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Basic Video Component

The main composition is in `src/Video.tsx`:

```tsx
import { Timegroup, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup
      workbench
      className="w-[1920px] h-[1080px] bg-black"
      mode="sequence"
    >
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Text duration="5s" className="text-white text-4xl">
          Your video starts here
        </Text>
      </Timegroup>
    </Timegroup>
  );
};
```

And `src/main.tsx` wraps it with `TimelineRoot`:

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

**Important**: `TimelineRoot` is required for proper rendering. It ensures React hooks and state work correctly during video rendering. See [timeline-root.md](timeline-root.md) for details.

## Add Assets

Place media files in `src/assets/`:

```
src/assets/
├── video.mp4
├── music.mp3
├── logo.png
└── captions.json
```

Reference with `/assets/filename`:

```tsx
import { Video, Audio, Image } from "@editframe/react";

<Video src="/assets/video.mp4" />
<Audio src="/assets/music.mp3" />
<Image src="/assets/logo.png" />
```

## TimelineRoot Requirement

All React projects must use `TimelineRoot` to wrap the composition component. This ensures:
- React hooks work during rendering
- State and effects are present during rendering
- Consistent behavior between preview and render

See [timeline-root.md](timeline-root.md) for complete documentation.

## Rendering

See the `elements-composition` skill for information about rendering via CLI or Playwright.
