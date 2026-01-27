# Timegroup

Container component for sequencing and grouping elements.

## Import

```tsx
import { Timegroup } from "@editframe/react";
```

## Props

- `mode` - `"fixed"` | `"sequence"` | `"contain"` | `"fit"`
- `duration` - Explicit duration (for fixed mode) - e.g. `"5s"`, `"1000ms"`, `"2m"`
- `workbench` - Enable timeline/hierarchy UI (root only) - boolean
- `className` - CSS classes for styling
- `ref` - React ref (useful with hooks)
- All standard HTML div attributes

## Modes

- `fixed` - Uses `duration` prop
- `sequence` - Sum of children (sequential playback)
- `contain` - Longest child duration
- `fit` - Inherit from parent

## Root Timegroup

```tsx
import { Timegroup } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup workbench mode="sequence" className="w-[800px] h-[500px] bg-black">
      {/* scenes here */}
    </Timegroup>
  );
};
```

## Scene (Fixed Duration)

```tsx
<Timegroup mode="fixed" duration="5s" className="absolute w-full h-full">
  <Video src="/assets/clip.mp4" className="size-full object-cover" />
  <Text className="absolute top-4 left-4 text-white">Overlay</Text>
</Timegroup>
```

## Nested Sequence

```tsx
<Timegroup mode="sequence">
  <Timegroup mode="fixed" duration="3s">
    {/* Scene 1 */}
  </Timegroup>
  <Timegroup mode="fixed" duration="5s">
    {/* Scene 2 */}
  </Timegroup>
  <Timegroup mode="fixed" duration="4s">
    {/* Scene 3 */}
  </Timegroup>
</Timegroup>
```

## Dynamic Content

Map over data to create scenes:

```tsx
const scenes = [
  { id: 1, text: "Scene 1", duration: "3s" },
  { id: 2, text: "Scene 2", duration: "5s" },
  { id: 3, text: "Scene 3", duration: "4s" },
];

<Timegroup workbench mode="sequence" className="w-[800px] h-[500px]">
  {scenes.map((scene) => (
    <Timegroup
      key={scene.id}
      mode="fixed"
      duration={scene.duration}
      className="absolute w-full h-full"
    >
      <Text className="text-white text-4xl">{scene.text}</Text>
    </Timegroup>
  ))}
</Timegroup>
```

## With useTimingInfo Hook

```tsx
import { Timegroup } from "@editframe/react";
import { useTimingInfo } from "@editframe/react";

const AnimatedScene = () => {
  const { ref, percentComplete, ownCurrentTimeMs } = useTimingInfo();
  
  return (
    <Timegroup ref={ref} mode="contain" className="absolute w-full h-full">
      <div style={{ opacity: percentComplete }}>
        Fading in... {(ownCurrentTimeMs / 1000).toFixed(2)}s
      </div>
    </Timegroup>
  );
};
```
