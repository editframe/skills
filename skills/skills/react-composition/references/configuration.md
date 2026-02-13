---
title: Configuration
description: Configure the Editframe environment settings for API and media engine
type: reference
nav:
  parent: "Core Concepts"
  priority: 0
  related: ["timeline-root"]
api:
  properties:
    - name: apiHost
      type: string
      description: API server URL for transcription/rendering
    - name: mediaEngine
      type: string
      description: Where to load media files
      values: ["local", "remote"]
    - name: children
      type: React.ReactNode
      description: Application content (typically TimelineRoot)
---

# Configuration

Configure the Editframe environment settings.

## Import

```tsx
import { Configuration } from "@editframe/react";
```

## Basic Usage

```tsx
// Video.tsx
import { Timegroup } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
      {/* Your composition */}
    </Timegroup>
  );
};

// main.tsx
import ReactDOM from "react-dom/client";
import { Configuration, TimelineRoot } from "@editframe/react";
import { Video } from "./Video";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Configuration apiHost="https://api.example.com" mediaEngine="local">
    <TimelineRoot id="root" component={Video} />
  </Configuration>
);
```

## Media Engine

### Local (Development)

Uses local files from your dev server:

```tsx
<Configuration mediaEngine="local">
  <Timegroup mode="sequence">
    <Video src="/assets/local-video.mp4" />
  </Timegroup>
</Configuration>
```

### Remote (Production)

Loads media from remote URLs:

```tsx
<Configuration mediaEngine="remote">
  <Timegroup mode="sequence">
    <Video src="https://cdn.example.com/video.mp4" />
  </Timegroup>
</Configuration>
```

## API Host

Set the API endpoint for transcription and rendering:

```tsx
<Configuration apiHost="https://api.editframe.com">
  <Timegroup mode="sequence">
    {/* Composition */}
  </Timegroup>
</Configuration>
```

## Environment-Based Config

```tsx
const apiHost = import.meta.env.VITE_API_HOST || "http://localhost:3000";
const mediaEngine = import.meta.env.PROD ? "remote" : "local";

export const Video = () => {
  return (
    <Configuration apiHost={apiHost} mediaEngine={mediaEngine}>
      <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
        {/* Your composition */}
      </Timegroup>
    </Configuration>
  );
};
```

## Without Configuration

If you don't need API features (transcription) or want default settings, you can omit Configuration:

```tsx
export const Video = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px]">
      {/* Your composition */}
    </Timegroup>
  );
};
```

## Typical Setup

```tsx
// VideoComposition.tsx
import { Timegroup, Video, Audio } from "@editframe/react";

export const VideoComposition = () => {
  return (
    <Timegroup 
      
      mode="sequence" 
      className="w-[1920px] h-[1080px] bg-black"
    >
      <Timegroup mode="fixed" duration="10s" className="absolute w-full h-full">
        <Video src="/assets/intro.mp4" className="size-full object-cover" />
        <Audio src="/assets/music.mp3" volume={0.3} />
      </Timegroup>
    </Timegroup>
  );
};

// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Configuration, TimelineRoot } from "@editframe/react";
import { VideoComposition } from "./VideoComposition";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Configuration 
    apiHost={import.meta.env.VITE_EDITFRAME_API}
    mediaEngine="local"
  >
    <TimelineRoot id="root" component={VideoComposition} />
  </Configuration>
);
```
