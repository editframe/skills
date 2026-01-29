# TimelineRoot

Factory wrapper component that enables proper clone rendering for React-based timelines.

## Why TimelineRoot is Required

When Editframe renders videos, it creates **clones** of your timeline for each frame. Without `TimelineRoot`, these clones are just copied DOM nodes without React bindings, which means:

- React hooks won't work (`useTimingInfo`, `useEffect`, etc.)
- JavaScript state and effects won't be present
- Dynamic content won't update correctly
- Render output may not match preview

`TimelineRoot` solves this by re-rendering the entire React component tree for each clone, ensuring consistent behavior between preview and render.

## Import

```tsx
import { TimelineRoot } from "@editframe/react";
```

## Props

- `id` - Unique identifier for the root timegroup (required)
- `component` - React component that renders your timeline content (required)
- `className` - Optional CSS class name for the container
- `style` - Optional inline styles for the container
- `children` - Optional children (typically used for Configuration wrapper)

## Basic Usage

### Minimal Setup

```tsx
// Video.tsx
import { Timegroup, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
        <Text duration="5s" className="text-white text-4xl">
          Your video starts here
        </Text>
      </Timegroup>
    </Timegroup>
  );
};

// main.tsx
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

### With Configuration

```tsx
// main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Configuration, TimelineRoot } from "@editframe/react";
import { Video } from "./Video";
import "@editframe/elements/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <Configuration apiHost="https://api.example.com" mediaEngine="local">
    <TimelineRoot id="root" component={Video} />
  </Configuration>
);
```

### With Workbench

The root `Timegroup` in your component should have the `workbench` prop:

```tsx
// Video.tsx
export const Video = () => {
  return (
    <Timegroup 
      workbench  // Enables workbench UI
      mode="sequence" 
      className="w-[1920px] h-[1080px] bg-black"
    >
      {/* Your composition */}
    </Timegroup>
  );
};

// main.tsx
ReactDOM.createRoot(root).render(
  <TimelineRoot id="root" component={Video} />
);
```

## How It Works

### Prime Timeline vs Render Clones

1. **Prime Timeline**: The original timeline you see in the browser preview
2. **Render Clones**: Copies created for each frame during video rendering

`TimelineRoot` registers an initializer that:
1. Removes the cloned DOM (which has no React bindings)
2. Creates a fresh React root for the clone
3. Renders the component tree using `flushSync` (synchronous)
4. Ensures all hooks, state, and effects work correctly

### Synchronous Rendering

The initializer uses `flushSync` to render synchronously, which is required by Editframe's rendering system:

```tsx
flushSync(() => {
  root.render(<Component />);
});
```

This ensures the component tree is fully rendered before the frame is captured.

## Examples

### With useTimingInfo Hook

```tsx
// AnimatedScene.tsx
import { Timegroup, Text, useTimingInfo } from "@editframe/react";

const AnimatedScene = () => {
  const { ref, percentComplete } = useTimingInfo();
  
  return (
    <Timegroup ref={ref} mode="fixed" duration="5s" className="absolute w-full h-full">
      <div style={{ opacity: percentComplete }}>
        <Text duration="5s" className="text-white text-4xl">
          Fading in...
        </Text>
      </div>
    </Timegroup>
  );
};

export const Video = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <AnimatedScene />
    </Timegroup>
  );
};

// main.tsx
ReactDOM.createRoot(root).render(
  <TimelineRoot id="root" component={Video} />
);
```

### With Dynamic Content

```tsx
// DynamicVideo.tsx
import { Timegroup, Text } from "@editframe/react";

interface VideoProps {
  title: string;
  duration: string;
}

const DynamicVideo = ({ title, duration }: VideoProps) => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <Timegroup mode="fixed" duration={duration} className="absolute w-full h-full">
        <Text duration={duration} className="text-white text-4xl">
          {title}
        </Text>
      </Timegroup>
    </Timegroup>
  );
};

// Wrapper component for TimelineRoot
export const Video = () => {
  return <DynamicVideo title="Hello World" duration="5s" />;
};

// main.tsx
ReactDOM.createRoot(root).render(
  <TimelineRoot id="root" component={Video} />
);
```

### With Frame Tasks

```tsx
// CounterScene.tsx
import { useRef, useEffect } from "react";
import { Timegroup } from "@editframe/react";

const CounterScene = () => {
  const timegroupRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const tg = timegroupRef.current;
    if (!tg) return;
    
    tg.initializer = (instance) => {
      return instance.addFrameTask((info) => {
        const text = instance.querySelector('.counter-text');
        if (text) {
          const seconds = (info.ownCurrentTimeMs / 1000).toFixed(2);
          text.textContent = `Time: ${seconds}s`;
        }
      });
    };
    
    return () => {
      if (tg) tg.initializer = undefined;
    };
  }, []);
  
  return (
    <Timegroup ref={timegroupRef} mode="fixed" duration="10s" className="absolute w-full h-full">
      <div className="text-4xl text-white counter-text" />
    </Timegroup>
  );
};

export const Video = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      <CounterScene />
    </Timegroup>
  );
};

// main.tsx - TimelineRoot ensures frame tasks work in render clones
ReactDOM.createRoot(root).render(
  <TimelineRoot id="root" component={Video} />
);
```

## Common Patterns

### Separating Composition from Wrapper

```tsx
// VideoComposition.tsx - Pure composition logic
export const VideoComposition = () => {
  return (
    <Timegroup mode="sequence" className="w-[1920px] h-[1080px] bg-black">
      {/* Your scenes */}
    </Timegroup>
  );
};

// App.tsx - Wrapper with Configuration
import { Configuration, TimelineRoot } from "@editframe/react";
import { VideoComposition } from "./VideoComposition";

export const App = () => {
  return (
    <Configuration 
      apiHost={import.meta.env.VITE_EDITFRAME_API}
      mediaEngine="local"
    >
      <TimelineRoot id="root" component={VideoComposition} />
    </Configuration>
  );
};
```

### Multiple Timelines

If you need multiple independent timelines, use different IDs:

```tsx
<div>
  <TimelineRoot id="timeline-1" component={Video1} />
  <TimelineRoot id="timeline-2" component={Video2} />
</div>
```

### Custom Container Styling

```tsx
<TimelineRoot 
  id="root" 
  component={Video}
  className="custom-container"
  style={{ maxWidth: '1920px', margin: '0 auto' }}
/>
```

## Requirements

### Component Must Return Timegroup

Your component **must** render a `Timegroup` at the root level:

```tsx
// ✅ Correct
export const Video = () => {
  return (
    <Timegroup mode="sequence">
      {/* content */}
    </Timegroup>
  );
};

// ❌ Wrong - no Timegroup at root
export const Video = () => {
  return (
    <div>
      <Timegroup mode="sequence">
        {/* content */}
      </Timegroup>
    </div>
  );
};
```

### Synchronous Rendering Only

The component must render synchronously. Avoid:
- Suspense boundaries
- Lazy loading at the root
- Async data fetching that blocks render

```tsx
// ✅ Correct - synchronous render
export const Video = () => {
  return <Timegroup mode="sequence">{/* content */}</Timegroup>;
};

// ❌ Wrong - Suspense blocks synchronous render
export const Video = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Timegroup mode="sequence">{/* content */}</Timegroup>
    </Suspense>
  );
};
```

## Troubleshooting

### "No ef-timegroup found in component"

Your component must render a `Timegroup` at the root level. Check that:
- Component returns a `Timegroup` directly
- No wrapper divs around the `Timegroup`
- Component is not returning `null` or `undefined`

### Hooks Not Working in Render

Make sure you're using `TimelineRoot` in your `main.tsx`:

```tsx
// ❌ Wrong - hooks won't work in render clones
ReactDOM.createRoot(root).render(<Video />);

// ✅ Correct - hooks work everywhere
ReactDOM.createRoot(root).render(
  <TimelineRoot id="root" component={Video} />
);
```

### Render Output Doesn't Match Preview

This usually means `TimelineRoot` is missing. The preview works because it has React bindings, but render clones don't without `TimelineRoot`.

## Performance Considerations

`TimelineRoot` re-renders the entire React component tree for each clone. This is necessary for correctness, but means:

- Keep your component tree reasonably sized
- Avoid expensive computations in render
- Use memoization for complex calculations
- Frame tasks are still the best way to update content per-frame

## See Also

- [scripting.md](scripting.md) - Frame tasks and initializers
- [hooks.md](hooks.md) - useTimingInfo and other hooks
- [configuration.md](configuration.md) - Configuration component
- [getting-started.md](getting-started.md) - Project setup
