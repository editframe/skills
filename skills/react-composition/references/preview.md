# Preview

Video preview player component for viewing compositions.

## Import

```tsx
import { Preview } from "@editframe/react";
```

## Props

- `className` - CSS classes for styling
- Standard HTML div attributes

## Basic Usage

```tsx
import { Configuration, Preview, Timegroup, Video } from "@editframe/react";

export const App = () => {
  return (
    <Configuration mediaEngine="local">
      <div className="flex">
        {/* Preview player */}
        <div className="flex-1">
          <Preview className="w-full h-[600px]" />
        </div>
        
        {/* Composition */}
        <Timegroup workbench mode="sequence" className="w-[1920px] h-[1080px]">
          <Video src="/assets/video.mp4" />
        </Timegroup>
      </div>
    </Configuration>
  );
};
```

## With Controls

```tsx
import { Preview, Controls } from "@editframe/react";

<div className="flex flex-col">
  <Preview className="w-full h-[600px] bg-black" />
  <Controls className="w-full" />
</div>
```

## Styled Preview

```tsx
<Preview className="w-[1280px] h-[720px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl" />
```

## Split View

```tsx
import { Preview, Timegroup, Video, Text } from "@editframe/react";

export const SplitView = () => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {/* Left: Preview */}
      <div>
        <h2 className="text-xl mb-2">Preview</h2>
        <Preview className="w-full aspect-video bg-black rounded" />
      </div>
      
      {/* Right: Composition */}
      <div>
        <h2 className="text-xl mb-2">Composition</h2>
        <Timegroup workbench mode="sequence" className="w-[1920px] h-[1080px]">
          <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
            <Video src="/assets/video.mp4" className="size-full" />
            <Text duration="5s" className="text-white text-4xl">
              Title
            </Text>
          </Timegroup>
        </Timegroup>
      </div>
    </div>
  );
};
```

## Full Editor Layout

```tsx
import { Preview, Controls, Workbench } from "@editframe/react";

export const Editor = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top: Preview */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <Preview className="max-w-[1280px] max-h-[720px] w-full bg-black rounded shadow-2xl" />
      </div>
      
      {/* Middle: Controls */}
      <div className="px-4 py-2">
        <Controls className="w-full" />
      </div>
      
      {/* Bottom: Timeline */}
      <div className="h-64 border-t border-gray-700">
        <Workbench />
      </div>
    </div>
  );
};
```

## Responsive Preview

```tsx
<Preview className="w-full aspect-video max-w-[1920px] mx-auto bg-black" />
```

## Notes

- Preview automatically connects to the workbench timeline
- Shows real-time playback of your composition
- Scales to fit the container while maintaining aspect ratio
- Use with `Controls` component for playback buttons
