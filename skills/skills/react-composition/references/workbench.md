# Workbench

Full timeline editor UI with hierarchy and timeline views.

## Import

```tsx
import { Workbench } from "@editframe/react";
```

## Props

- `className` - CSS classes for styling

## Basic Usage

The `workbench` prop on the root `Timegroup` automatically enables the workbench UI:

```tsx
import { Timegroup, Video, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup 
      workbench  // Enables workbench UI
      mode="sequence" 
      className="w-[1920px] h-[1080px] bg-black"
    >
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Video src="/assets/intro.mp4" className="size-full" />
        <Text duration="5s" className="text-white text-4xl">Title</Text>
      </Timegroup>
    </Timegroup>
  );
};
```

## Standalone Workbench Component

Use `Workbench` component for custom layouts:

```tsx
import { Preview, Controls, Workbench } from "@editframe/react";

export const Editor = () => {
  return (
    <div className="h-screen flex flex-col">
      {/* Top: Preview */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
        <Preview className="max-w-[1280px] w-full aspect-video bg-black" />
      </div>
      
      {/* Middle: Controls */}
      <div className="px-4 py-2 bg-gray-800">
        <Controls />
      </div>
      
      {/* Bottom: Timeline */}
      <div className="h-80 border-t border-gray-700">
        <Workbench className="w-full h-full" />
      </div>
    </div>
  );
};
```

## Features

The workbench provides:

- **Timeline view** - Visual timeline with all elements
- **Hierarchy view** - Tree structure of your composition
- **Playhead scrubbing** - Click timeline to seek
- **Element selection** - Click elements to select
- **Duration visualization** - See timing of all elements

## Full Editor Layout

```tsx
import { 
  Configuration,
  Preview, 
  Controls, 
  Workbench,
  Timegroup,
  Video,
  Audio,
  Text
} from "@editframe/react";

export const FullEditor = () => {
  return (
    <Configuration mediaEngine="local">
      <div className="h-screen flex flex-col bg-gray-950">
        {/* Header */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4">
          <h1 className="text-white text-xl font-bold">Video Editor</h1>
        </header>
        
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Preview area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-900">
            <Preview className="max-w-[1280px] w-full aspect-video bg-black rounded-lg shadow-2xl" />
          </div>
          
          {/* Controls */}
          <div className="bg-gray-800 border-y border-gray-700">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <Controls />
            </div>
          </div>
          
          {/* Timeline */}
          <div className="h-80 bg-gray-900 border-t border-gray-800">
            <Workbench className="w-full h-full" />
          </div>
        </div>
        
        {/* Hidden composition */}
        <div className="hidden">
          <Timegroup workbench mode="sequence" className="w-[1920px] h-[1080px]">
            <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
              <Video src="/assets/video.mp4" className="size-full object-cover" />
              <Text duration="5s" className="absolute top-8 text-white text-4xl">
                Title
              </Text>
              <Audio src="/assets/music.mp3" volume={0.3} />
            </Timegroup>
          </Timegroup>
        </div>
      </div>
    </Configuration>
  );
};
```

## Resizable Timeline

```tsx
import { useState } from "react";

export const ResizableEditor = () => {
  const [timelineHeight, setTimelineHeight] = useState(320);
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <Preview className="w-full h-full" />
      </div>
      
      <div style={{ height: `${timelineHeight}px` }} className="border-t">
        <Workbench className="w-full h-full" />
      </div>
    </div>
  );
};
```

## Side-by-Side Layout

```tsx
export const SideBySideEditor = () => {
  return (
    <div className="h-screen grid grid-cols-2">
      {/* Left: Preview & Controls */}
      <div className="flex flex-col">
        <Preview className="flex-1 bg-black" />
        <Controls className="bg-gray-800 p-4" />
      </div>
      
      {/* Right: Timeline */}
      <div className="border-l border-gray-700">
        <Workbench className="w-full h-full" />
      </div>
    </div>
  );
};
```

## Notes

- The `workbench` prop on root `Timegroup` enables automatic UI
- Use `Workbench` component for custom layouts
- Timeline shows all elements and their timing
- Hierarchy shows nested structure
- Interactive scrubbing and element selection
