# Controls

Playback controls for timeline navigation.

## Import

```tsx
import { Controls } from "@editframe/react";
```

## Individual Control Components

```tsx
import {
  Play,
  Pause,
  TogglePlay,
  ToggleLoop,
  Scrubber,
  TimeDisplay,
} from "@editframe/react";
```

## Props

- `className` - CSS classes for styling
- Component-specific props for customization

## Basic Usage

```tsx
import { Controls, Preview } from "@editframe/react";

<div className="flex flex-col">
  <Preview className="w-full h-[600px]" />
  <Controls className="w-full bg-gray-800 p-2" />
</div>
```

## Individual Controls

Build custom control layouts:

```tsx
import { TogglePlay, ToggleLoop, Scrubber, TimeDisplay } from "@editframe/react";

<div className="flex items-center gap-4 bg-gray-800 p-4">
  <TogglePlay className="w-10 h-10" />
  <TimeDisplay className="text-white text-sm font-mono" />
  <Scrubber className="flex-1" />
  <ToggleLoop className="w-10 h-10" />
</div>
```

## Styled Controls

```tsx
<div className="flex items-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-lg shadow-lg">
  <TogglePlay className="text-white hover:text-blue-400 transition" />
  <Scrubber className="flex-1 h-2" />
  <TimeDisplay className="text-white text-xs font-mono bg-black/30 px-2 py-1 rounded" />
  <ToggleLoop className="text-white hover:text-green-400 transition" />
</div>
```

## Full Editor Controls

```tsx
import { 
  Preview, 
  TogglePlay, 
  ToggleLoop, 
  Scrubber, 
  TimeDisplay 
} from "@editframe/react";

export const VideoEditor = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Preview */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Preview className="w-full max-w-[1280px] aspect-video bg-black rounded-lg" />
      </div>
      
      {/* Controls Bar */}
      <div className="bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-4 px-6 py-3">
          {/* Play/Pause */}
          <TogglePlay className="w-8 h-8 text-white hover:text-blue-400" />
          
          {/* Time Display */}
          <TimeDisplay className="text-white text-sm font-mono min-w-[120px]" />
          
          {/* Scrubber */}
          <div className="flex-1">
            <Scrubber className="w-full h-2" />
          </div>
          
          {/* Loop Toggle */}
          <ToggleLoop className="w-8 h-8 text-white hover:text-green-400" />
        </div>
      </div>
    </div>
  );
};
```

## Minimal Controls

```tsx
<div className="flex items-center gap-2 p-2 bg-black/80 rounded">
  <TogglePlay className="w-6 h-6 text-white" />
  <Scrubber className="flex-1" />
</div>
```

## Scrubber Component

The timeline scrubber for seeking:

```tsx
import { Scrubber } from "@editframe/react";

<Scrubber 
  className="w-full h-2 bg-gray-700 rounded cursor-pointer"
/>
```

### Scrubber Props

```tsx
interface ScrubberProps {
  className?: string;
  // Styling props...
}
```

## TimeDisplay Component

Shows current time and duration:

```tsx
import { TimeDisplay } from "@editframe/react";

<TimeDisplay className="text-white text-sm font-mono" />
// Displays: "00:05 / 00:30"
```

## TogglePlay Component

Play/pause button:

```tsx
import { TogglePlay } from "@editframe/react";

<TogglePlay className="w-10 h-10 text-white hover:text-blue-400" />
```

## ToggleLoop Component

Enable/disable looping:

```tsx
import { ToggleLoop } from "@editframe/react";

<ToggleLoop className="w-10 h-10 text-white hover:text-green-400" />
```

## Custom Control Bar

```tsx
const CustomControls = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
      <div className="max-w-4xl mx-auto">
        {/* Scrubber on top */}
        <Scrubber className="w-full h-1 mb-4" />
        
        {/* Buttons below */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TogglePlay className="w-12 h-12 text-white" />
            <TimeDisplay className="text-white text-lg font-mono" />
          </div>
          
          <ToggleLoop className="w-10 h-10 text-white" />
        </div>
      </div>
    </div>
  );
};
```
