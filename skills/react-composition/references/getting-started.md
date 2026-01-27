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

## Rendering

See the `elements-composition` skill for information about rendering via CLI or Playwright.
